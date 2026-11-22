"""Every error leaves the API in the standard shape, and leaks nothing."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from nigehban_contracts import ErrorBody, ErrorCode

from app.core.errors import ApiError


def _check(res, status: int, code: ErrorCode) -> dict:
    assert res.status_code == status
    body = ErrorBody.model_validate(res.json())  # exactly {"error": {"code", "message"}}
    assert body.error.code == code
    return res.json()["error"]


def test_unknown_route_is_not_found(client: TestClient):
    err = _check(client.get("/api/does-not-exist"), 404, ErrorCode.NOT_FOUND)
    assert "does-not-exist" not in err["message"]


def test_wrong_method_uses_the_same_shape(client: TestClient):
    _check(client.delete("/api/health"), 405, ErrorCode.NOT_FOUND)


def test_unexpected_exception_is_a_500_without_details(app: FastAPI, client: TestClient, caplog):
    @app.get("/api/_boom")
    def boom() -> None:
        raise RuntimeError(r"secret detail at C:\Users\someone\file.py")

    res = client.get("/api/_boom")
    _check(res, 500, ErrorCode.INTERNAL_ERROR)
    assert "secret" not in res.text and "Traceback" not in res.text and "C:" not in res.text
    assert "secret detail" in caplog.text  # the traceback is logged, not returned


def test_api_error_is_rendered(app: FastAPI, client: TestClient):
    @app.get("/api/_teapot")
    def teapot() -> None:
        raise ApiError(409, ErrorCode.INVALID_TRANSITION, "Cannot do that.")

    err = _check(client.get("/api/_teapot"), 409, ErrorCode.INVALID_TRANSITION)
    assert err["message"] == "Cannot do that."


def test_query_validation_error_names_the_field_only(app: FastAPI, client: TestClient):
    @app.get("/api/_page")
    def page(page: int = 1) -> dict:
        return {"page": page}

    res = client.get("/api/_page", params={"page": "abc-secret"})
    err = _check(res, 422, ErrorCode.VALIDATION_ERROR)
    assert err["message"].startswith("page:")
    assert "abc-secret" not in res.text


def test_health_still_works_with_handlers(client: TestClient):
    assert client.get("/api/health").status_code == 200
