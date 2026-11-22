"""Login rate limiting (slowapi): per client address, standard error shape, window expiry."""

import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from nigehban_contracts import ErrorBody, ErrorCode
from pydantic import ValidationError

from app.core.rate_limit import limiter
from app.core.settings import Settings, get_settings

PASSWORD = "correct-horse-battery"  # same as conftest.PASSWORD
LIMIT = 3


@pytest.fixture
def limited(monkeypatch: pytest.MonkeyPatch):
    """Rate limiting on, at 3 attempts per minute, with empty counters before and after."""
    monkeypatch.setattr(limiter, "enabled", True)
    monkeypatch.setattr(get_settings(), "login_rate_limit", f"{LIMIT}/minute")
    limiter.reset()
    yield
    limiter.reset()


def _login(client: TestClient, password: str = PASSWORD, username: str = "operator"):
    return client.post("/api/auth/login", json={"username": username, "password": password})


@pytest.mark.usefixtures("limited")
def test_attempts_over_the_limit_get_429_in_the_standard_shape(client: TestClient, operator):
    assert [_login(client).status_code for _ in range(LIMIT)] == [200] * LIMIT
    blocked = _login(client)

    assert blocked.status_code == 429
    body = ErrorBody.model_validate(blocked.json())
    assert body.error.code == ErrorCode.RATE_LIMITED
    assert "Too many attempts" in body.error.message
    assert blocked.headers["retry-after"] == "60"
    assert "password" not in blocked.text.lower().replace("too many attempts", "")


@pytest.mark.usefixtures("limited")
def test_wrong_passwords_count_and_the_right_one_is_blocked_too(client: TestClient, operator):
    for _ in range(LIMIT):
        assert _login(client, "nope-nope-nope").status_code == 401
    assert _login(client, "nope-nope-nope").status_code == 429
    assert _login(client).status_code == 429  # the correct password does not get through either


@pytest.mark.usefixtures("limited")
def test_unknown_usernames_count_too(client: TestClient, operator):
    for _ in range(LIMIT):
        assert _login(client, username="ghost").status_code == 401
    assert _login(client, username="operator").status_code == 429


@pytest.mark.usefixtures("limited")
def test_limit_is_per_client_address(app: FastAPI, client: TestClient, operator):
    for _ in range(LIMIT + 1):
        _login(client)
    assert _login(client).status_code == 429

    other = TestClient(app, raise_server_exceptions=False, client=("203.0.113.9", 40000))
    assert _login(other).status_code == 200


@pytest.mark.usefixtures("limited")
def test_only_login_is_limited(client: TestClient, operator, login):
    headers = None
    for _ in range(LIMIT):
        headers = login("operator")
    for _ in range(LIMIT + 2):  # more than the limit, on other endpoints
        assert client.get("/api/auth/me", headers=headers).status_code == 200
        assert client.get("/api/health").status_code == 200


@pytest.mark.usefixtures("limited")
def test_malformed_requests_do_not_use_up_attempts(client: TestClient, operator):
    for _ in range(LIMIT + 2):
        assert client.post("/api/auth/login", json={"username": "x"}).status_code == 422
    assert _login(client).status_code == 200


def test_attempts_are_allowed_again_when_the_window_passes(
    monkeypatch: pytest.MonkeyPatch, client: TestClient, operator
):
    monkeypatch.setattr(limiter, "enabled", True)
    monkeypatch.setattr(get_settings(), "login_rate_limit", "2/second")
    limiter.reset()
    try:
        assert [_login(client).status_code for _ in range(2)] == [200, 200]
        third = _login(client)
        assert third.status_code == 429 and third.headers["retry-after"] == "1"
        time.sleep(1.2)
        assert _login(client).status_code == 200
    finally:
        limiter.reset()


def test_message_says_how_long_to_wait(
    monkeypatch: pytest.MonkeyPatch, client: TestClient, operator
):
    monkeypatch.setattr(limiter, "enabled", True)
    monkeypatch.setattr(get_settings(), "login_rate_limit", "1/hour")
    limiter.reset()
    try:
        _login(client)
        blocked = _login(client)
        assert blocked.headers["retry-after"] == "3600"
        assert "up to 60 minutes" in blocked.json()["error"]["message"]
    finally:
        limiter.reset()


def test_disabled_by_setting_never_blocks(client: TestClient, operator):
    assert limiter.enabled is False  # the suite default (RATE_LIMIT_ENABLED=false)
    assert all(_login(client).status_code == 200 for _ in range(15))


def test_default_limit_and_validation(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("RATE_LIMIT_ENABLED")  # the suite switches it off; check the real default
    defaults = Settings(
        _env_file=None,
        database_url="postgresql+psycopg://u:p@h/d",
        jwt_secret="j" * 32,
        worker_key="w" * 32,
    )
    assert defaults.login_rate_limit == "10/minute" and defaults.rate_limit_enabled is True
    for bad in ("", "ten per minute", "10", "0/minute", "5/fortnight", "10/minute;0/hour"):
        with pytest.raises(ValidationError, match="10/minute"):  # the hint names the format
            Settings(
                _env_file=None,
                database_url="postgresql+psycopg://u:p@h/d",
                jwt_secret="j" * 32,
                worker_key="w" * 32,
                login_rate_limit=bad,
            )


def test_openapi_documents_the_429(app: FastAPI):
    responses = app.openapi()["paths"]["/api/auth/login"]["post"]["responses"]
    assert "429" in responses


def test_several_limits_can_be_combined():
    ok = Settings(
        _env_file=None,
        database_url="postgresql+psycopg://u:p@h/d",
        jwt_secret="j" * 32,
        worker_key="w" * 32,
        login_rate_limit="10/minute;50/hour",
    )
    assert ok.login_rate_limit == "10/minute;50/hour"
