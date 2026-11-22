"""Login, /me, token checks and the admin guard."""

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from nigehban_contracts import ErrorCode
from sqlalchemy.orm import Session

from app.core.security import ALGORITHM, create_access_token
from app.core.settings import get_settings
from app.models import User
from app.routers.deps import AdminUser, CurrentUser

PASSWORD = "correct-horse-battery"  # same as conftest.PASSWORD


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _error(res) -> dict:
    body = res.json()
    assert set(body) == {"error"} and set(body["error"]) == {"code", "message"}
    return body["error"]


def test_login_returns_token_and_user(client: TestClient, operator: User):
    res = client.post("/api/auth/login", json={"username": "operator", "password": PASSWORD})
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["user"] == {
        "id": operator.id,
        "username": "operator",
        "display_name": "Operator",
        "role": "operator",
    }
    expires = datetime.fromisoformat(body["expires_at"])
    assert timedelta(hours=11, minutes=59) < expires - datetime.now(UTC) <= timedelta(hours=12)
    assert "password" not in res.text and "email" not in res.text


def test_token_holds_only_subject_and_times(client: TestClient, operator: User):
    token = client.post(
        "/api/auth/login", json={"username": "operator", "password": PASSWORD}
    ).json()["access_token"]
    claims = jwt.decode(token, options={"verify_signature": False})
    assert set(claims) == {"sub", "iat", "exp"}  # no role: it is read from the DB each time
    assert claims["sub"] == operator.id
    assert claims["exp"] - claims["iat"] == 12 * 3600


@pytest.mark.parametrize("username", ["OPERATOR", "  operator  ", "Operator"])
def test_username_is_case_and_space_insensitive(client: TestClient, operator: User, username):
    res = client.post("/api/auth/login", json={"username": username, "password": PASSWORD})
    assert res.status_code == 200


def test_wrong_password_and_unknown_user_look_identical(client: TestClient, operator: User):
    wrong = client.post("/api/auth/login", json={"username": "operator", "password": "nope-nope"})
    unknown = client.post("/api/auth/login", json={"username": "ghost", "password": "nope-nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    assert _error(wrong)["code"] == ErrorCode.UNAUTHORIZED
    assert wrong.headers["www-authenticate"] == "Bearer"


def test_login_validation_error_does_not_echo_input(client: TestClient):
    res = client.post(
        "/api/auth/login", json={"username": "x", "password": "hunter2-secret", "role": "admin"}
    )
    assert res.status_code == 422
    assert _error(res)["code"] == ErrorCode.VALIDATION_ERROR
    assert "hunter2-secret" not in res.text and "admin" not in res.text


@pytest.mark.parametrize("body", [{}, {"username": "a"}, {"username": "", "password": "x"}])
def test_login_missing_or_empty_fields_422(client: TestClient, body):
    res = client.post("/api/auth/login", json=body)
    assert res.status_code == 422
    assert _error(res)["code"] == ErrorCode.VALIDATION_ERROR


def test_me_with_valid_token(client: TestClient, operator: User, login):
    res = client.get("/api/auth/me", headers=login("operator"))
    assert res.status_code == 200
    assert res.json()["username"] == "operator"


def _token_for(user_id: str, **claims) -> str:
    now = datetime.now(UTC)
    payload = {"sub": user_id, "iat": now, "exp": now + timedelta(hours=1)} | claims
    return jwt.encode(payload, get_settings().jwt_secret.get_secret_value(), algorithm=ALGORITHM)


def test_me_rejects_bad_credentials(client: TestClient, operator: User):
    good = create_access_token(operator.id)[0]
    expired = create_access_token(operator.id, now=datetime.now(UTC) - timedelta(hours=13))[0]
    wrong_secret = jwt.encode(
        {"sub": operator.id, "iat": 1, "exp": 4_000_000_000}, "k" * 40, "HS256"
    )
    no_exp = jwt.encode(
        {"sub": operator.id, "iat": 1}, get_settings().jwt_secret.get_secret_value()
    )
    tampered = good[:40] + ("A" if good[40] != "A" else "B") + good[41:]
    cases = {
        "no header": {},
        "garbage": bearer("not-a-token"),
        "basic scheme": {"Authorization": "Basic Zm9vOmJhcg=="},
        "expired": bearer(expired),
        "wrong secret": bearer(wrong_secret),
        "missing exp": bearer(no_exp),
        "tampered": bearer(tampered),
        "unknown user": bearer(_token_for("usr_" + "0" * 26)),
    }
    for name, headers in cases.items():
        res = client.get("/api/auth/me", headers=headers)
        assert res.status_code == 401, name
        assert _error(res)["code"] == ErrorCode.UNAUTHORIZED, name
        assert res.headers["www-authenticate"] == "Bearer", name


def test_deleted_user_token_stops_working(client: TestClient, db: Session, operator: User, login):
    headers = login("operator")
    db.delete(db.get(User, operator.id))
    db.commit()
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_role_change_takes_effect_without_new_login(
    client: TestClient, app: FastAPI, db: Session, operator: User, login
):
    @app.get("/api/_admin-only")
    def admin_only(user: AdminUser) -> dict:
        return {"ok": True}

    headers = login("operator")
    assert client.get("/api/_admin-only", headers=headers).status_code == 403
    db.get(User, operator.id).role = "admin"
    db.commit()
    assert client.get("/api/_admin-only", headers=headers).status_code == 200


def test_admin_guard(client: TestClient, app: FastAPI, db: Session, operator, admin, login):
    @app.get("/api/_admin-only")
    def admin_only(user: AdminUser) -> dict:
        return {"user": user.username}

    forbidden = client.get("/api/_admin-only", headers=login("operator"))
    assert forbidden.status_code == 403
    assert _error(forbidden)["code"] == ErrorCode.FORBIDDEN
    assert client.get("/api/_admin-only").status_code == 401
    ok = client.get("/api/_admin-only", headers=login("admin"))
    assert ok.status_code == 200 and ok.json() == {"user": "admin"}


def test_current_user_dependency_is_reusable(app: FastAPI, client: TestClient, operator, login):
    @app.get("/api/_whoami")
    def whoami(user: CurrentUser) -> dict:
        return {"id": user.id}

    assert client.get("/api/_whoami", headers=login("operator")).json() == {"id": operator.id}


def test_two_users_do_not_mix(client: TestClient, create_user, operator, admin, login):
    create_user("third")
    assert client.get("/api/auth/me", headers=login("admin")).json()["role"] == "admin"
    assert client.get("/api/auth/me", headers=login("third")).json()["username"] == "third"
