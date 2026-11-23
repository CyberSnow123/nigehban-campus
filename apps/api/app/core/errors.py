"""One error shape for every response (Data-Contracts §6): ``{"error": {"code", "message"}}``.

No tracebacks, no file paths and no echoed request input ever reach the client.
"""

import logging
from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from nigehban_contracts import ErrorBody, ErrorCode, ErrorDetail
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("nigehban.api")

_STATUS_TO_CODE = {
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    405: ErrorCode.NOT_FOUND,
    422: ErrorCode.VALIDATION_ERROR,
    429: ErrorCode.RATE_LIMITED,
}
_CODE_MESSAGES = {
    ErrorCode.UNAUTHORIZED: "Authentication required.",
    ErrorCode.FORBIDDEN: "You do not have permission to do that.",
    ErrorCode.NOT_FOUND: "Not found.",
    ErrorCode.VALIDATION_ERROR: "The request is not valid.",
    ErrorCode.RATE_LIMITED: "Too many requests. Please wait and try again.",
    ErrorCode.INTERNAL_ERROR: "Something went wrong on the server.",
}


# For OpenAPI: documents the real error body instead of FastAPI's default 422 schema.
ERROR_RESPONSES: dict[int | str, dict] = {
    401: {"model": ErrorBody, "description": "Missing, invalid or expired token"},
    403: {"model": ErrorBody, "description": "Not allowed for this role"},
    429: {"model": ErrorBody, "description": "Too many attempts from this address"},
    422: {"model": ErrorBody, "description": "Request is not valid"},
}

# For the worker-only ingest routes (Data-Contracts §4).
INGEST_ERROR_RESPONSES: dict[int | str, dict] = {
    401: {"model": ErrorBody, "description": "Missing or wrong X-Worker-Key"},
    404: {"model": ErrorBody, "description": "Unknown run or camera"},
    409: {"model": ErrorBody, "description": "The run cannot take this (RUN_NOT_RUNNING)"},
    422: {"model": ErrorBody, "description": "Request is not valid"},
}


ALERT_ERROR_RESPONSES: dict[int | str, dict] = {
    **ERROR_RESPONSES,
    404: {"model": ErrorBody, "description": "No alert with this ID"},
    409: {"model": ErrorBody, "description": "Move not allowed (INVALID_TRANSITION)"},
}


class ApiError(Exception):
    """Raised by routers and services; rendered in the standard error shape.

    ``bearer`` adds ``WWW-Authenticate: Bearer`` to a 401. It is off for the worker key,
    which is not a Bearer token."""

    def __init__(self, status_code: int, code: ErrorCode, message: str, bearer: bool = True):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.bearer = bearer


def unauthorized(message: str = "Authentication required.") -> ApiError:
    return ApiError(401, ErrorCode.UNAUTHORIZED, message)


def worker_unauthorized() -> ApiError:
    return ApiError(401, ErrorCode.UNAUTHORIZED, "Missing or wrong worker key.", bearer=False)


def not_found(message: str = "Not found.") -> ApiError:
    return ApiError(404, ErrorCode.NOT_FOUND, message)


def run_not_running(message: str) -> ApiError:
    return ApiError(409, ErrorCode.RUN_NOT_RUNNING, message)


def invalid_transition(message: str) -> ApiError:
    return ApiError(409, ErrorCode.INVALID_TRANSITION, message)


def forbidden(message: str = "You do not have permission to do that.") -> ApiError:
    return ApiError(403, ErrorCode.FORBIDDEN, message)


def validation_error(message: str) -> ApiError:
    return ApiError(422, ErrorCode.VALIDATION_ERROR, message)


def error_response(
    status_code: int,
    code: ErrorCode,
    message: str,
    headers: dict[str, str] | None = None,
    bearer: bool = True,
) -> JSONResponse:
    body = ErrorBody(error=ErrorDetail(code=code, message=message))
    headers = dict(headers or {})
    if status_code == 401 and bearer:
        headers["WWW-Authenticate"] = "Bearer"
    return JSONResponse(body.model_dump(mode="json"), status_code=status_code, headers=headers)


def _wait_text(seconds: int) -> str:
    if seconds < 90:
        return f"{seconds} seconds"
    minutes = -(-seconds // 60)  # round up
    return f"{minutes} minutes"


def field_messages(errors: Sequence[Any], skip: int = 0, prefix: str = "") -> str:
    """``field: reason`` per Pydantic error. Only the reason text is used, never the input.

    ``skip`` drops leading location parts (``body``/``query`` for request errors), ``prefix``
    names the form field a nested JSON document came from."""
    parts = []
    for err in errors:
        loc = [str(p) for p in err["loc"]]
        # For broken JSON the location is a character offset, not a field: name the part only.
        path = loc[:1] if err.get("type") == "json_invalid" else loc[skip:]
        field = ".".join([prefix, *path] if prefix else path) or ".".join(loc)
        parts.append(f"{field}: {err['msg']}" if field else err["msg"])
    return "; ".join(parts) or _CODE_MESSAGES[ErrorCode.VALIDATION_ERROR]


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return error_response(exc.status_code, exc.code, exc.message, bearer=exc.bearer)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _STATUS_TO_CODE.get(exc.status_code, ErrorCode.INTERNAL_ERROR)
        return error_response(exc.status_code, code, _CODE_MESSAGES[code])

    @app.exception_handler(RateLimitExceeded)
    async def _rate_limited(_: Request, exc: RateLimitExceeded) -> JSONResponse:
        # The whole window length is an upper bound for how long the client must wait.
        wait = int(exc.limit.limit.get_expiry())
        message = f"Too many attempts. Please wait up to {_wait_text(wait)} and try again."
        return error_response(
            429, ErrorCode.RATE_LIMITED, message, headers={"Retry-After": str(wait)}
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return error_response(422, ErrorCode.VALIDATION_ERROR, field_messages(exc.errors(), 1))

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
        code = ErrorCode.INTERNAL_ERROR
        return error_response(500, code, _CODE_MESSAGES[code])
