"""One error shape for every response (Data-Contracts §6): ``{"error": {"code", "message"}}``.

No tracebacks, no file paths and no echoed request input ever reach the client.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from nigehban_contracts import ErrorBody, ErrorCode, ErrorDetail
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("nigehban.api")

_STATUS_TO_CODE = {
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    405: ErrorCode.NOT_FOUND,
    422: ErrorCode.VALIDATION_ERROR,
}
_CODE_MESSAGES = {
    ErrorCode.UNAUTHORIZED: "Authentication required.",
    ErrorCode.FORBIDDEN: "You do not have permission to do that.",
    ErrorCode.NOT_FOUND: "Not found.",
    ErrorCode.VALIDATION_ERROR: "The request is not valid.",
    ErrorCode.INTERNAL_ERROR: "Something went wrong on the server.",
}


# For OpenAPI: documents the real error body instead of FastAPI's default 422 schema.
ERROR_RESPONSES: dict[int | str, dict] = {
    401: {"model": ErrorBody, "description": "Missing, invalid or expired token"},
    403: {"model": ErrorBody, "description": "Not allowed for this role"},
    422: {"model": ErrorBody, "description": "Request is not valid"},
}


class ApiError(Exception):
    """Raised by routers and services; rendered in the standard error shape."""

    def __init__(self, status_code: int, code: ErrorCode, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def unauthorized(message: str = "Authentication required.") -> ApiError:
    return ApiError(401, ErrorCode.UNAUTHORIZED, message)


def forbidden(message: str = "You do not have permission to do that.") -> ApiError:
    return ApiError(403, ErrorCode.FORBIDDEN, message)


def validation_error(message: str) -> ApiError:
    return ApiError(422, ErrorCode.VALIDATION_ERROR, message)


def error_response(status_code: int, code: ErrorCode, message: str) -> JSONResponse:
    body = ErrorBody(error=ErrorDetail(code=code, message=message))
    headers = {"WWW-Authenticate": "Bearer"} if status_code == 401 else None
    return JSONResponse(body.model_dump(mode="json"), status_code=status_code, headers=headers)


def _field_messages(exc: RequestValidationError) -> str:
    """``field: reason`` per error. Only Pydantic's reason text is used, never the input."""
    parts = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err["loc"][1:]) or str(err["loc"][0])
        parts.append(f"{field}: {err['msg']}")
    return "; ".join(parts) or _CODE_MESSAGES[ErrorCode.VALIDATION_ERROR]


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return error_response(exc.status_code, exc.code, exc.message)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _STATUS_TO_CODE.get(exc.status_code, ErrorCode.INTERNAL_ERROR)
        return error_response(exc.status_code, code, _CODE_MESSAGES[code])

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return error_response(422, ErrorCode.VALIDATION_ERROR, _field_messages(exc))

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
        code = ErrorCode.INTERNAL_ERROR
        return error_response(500, code, _CODE_MESSAGES[code])
