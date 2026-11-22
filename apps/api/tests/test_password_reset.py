"""Forgot-password: neutral answers, one-time links, expiry, and signing out old sessions."""

import re
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from nigehban_contracts import ErrorCode
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_reset_token
from app.models import PasswordResetToken, User
from app.services import password_reset_service as svc

PASSWORD = "correct-horse-battery"  # same as conftest.PASSWORD
NEW_PASSWORD = "a-brand-new-passphrase"
NEUTRAL = "If that email is registered, a reset link has been sent."
LINK = re.compile(r"http://localhost:5173/reset-password\?token=([A-Za-z0-9_-]+)")


def _forgot(client: TestClient, email: str):
    return client.post("/api/auth/forgot-password", json={"email": email})


def _token_from(mailbox) -> str:
    match = LINK.search(mailbox.sent[-1]["body"])
    assert match, mailbox.sent[-1]["body"]
    return match.group(1)


def _reset(client: TestClient, token: str, password: str = NEW_PASSWORD):
    return client.post("/api/auth/reset-password", json={"token": token, "new_password": password})


def _login(client: TestClient, username: str, password: str):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def test_known_and_unknown_email_get_the_same_answer(client: TestClient, operator, mailbox):
    known = _forgot(client, "operator@example.test")
    unknown = _forgot(client, "nobody@example.test")
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json() == {"message": NEUTRAL}
    assert [m["to"] for m in mailbox.sent] == ["operator@example.test"]  # only the real one


def test_email_is_matched_case_insensitively(client: TestClient, operator, mailbox):
    assert _forgot(client, "  Operator@Example.TEST ").status_code == 202
    assert len(mailbox.sent) == 1


def test_email_content(client: TestClient, operator, mailbox):
    _forgot(client, "operator@example.test")
    mail = mailbox.sent[0]
    assert mail["subject"] == "Reset your Nigehban Campus password"
    assert "Hello Operator" in mail["body"] and "30 minutes" in mail["body"]
    assert LINK.search(mail["body"])


def test_user_without_email_gets_nothing(client: TestClient, create_user, mailbox):
    create_user("noemail")
    assert _forgot(client, "noemail@example.test").status_code == 202
    assert mailbox.sent == []


@pytest.mark.parametrize("email", ["", "not-an-email", "a@b", "x" * 250 + "@example.test"])
def test_bad_email_shape_is_422(client: TestClient, email):
    res = _forgot(client, email)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == ErrorCode.VALIDATION_ERROR


def test_full_flow_sets_password_and_link_works_once(client: TestClient, operator, mailbox):
    _forgot(client, "operator@example.test")
    token = _token_from(mailbox)

    ok = _reset(client, token)
    assert ok.status_code == 200
    assert _login(client, "operator", NEW_PASSWORD).status_code == 200
    assert _login(client, "operator", PASSWORD).status_code == 401

    again = _reset(client, token, "yet-another-passphrase")
    assert again.status_code == 422
    assert again.json()["error"] == {"code": "VALIDATION_ERROR", "message": svc.INVALID_LINK}
    assert _login(client, "operator", NEW_PASSWORD).status_code == 200  # second use changed nothing


def test_only_the_hash_is_stored(client: TestClient, db: Session, operator, mailbox):
    _forgot(client, "operator@example.test")
    token = _token_from(mailbox)
    rows = db.scalars(select(PasswordResetToken)).all()
    assert [r.token_hash for r in rows] == [hash_reset_token(token)]
    assert token not in rows[0].token_hash


@pytest.mark.parametrize("token", ["x" * 43, "short", "../../etc/passwd" + "a" * 20])
def test_garbage_token_is_rejected(client: TestClient, operator, token):
    res = _reset(client, token)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == ErrorCode.VALIDATION_ERROR


def test_expired_link_is_rejected(db: Session, operator):
    long_ago = datetime.now(UTC) - svc.RESET_TOKEN_TTL - timedelta(minutes=1)
    token, _ = svc.request_reset(db, "operator@example.test", now=long_ago)
    with pytest.raises(Exception, match="invalid or has expired"):
        svc.reset_password(db, token, NEW_PASSWORD)


def test_link_is_valid_until_the_last_moment(db: Session, operator):
    start = datetime(2026, 11, 22, 12, 0, tzinfo=UTC)
    token, _ = svc.request_reset(db, "operator@example.test", now=start)
    svc.reset_password(
        db, token, NEW_PASSWORD, now=start + svc.RESET_TOKEN_TTL - timedelta(seconds=1)
    )
    token2, _ = svc.request_reset(db, "operator@example.test", now=start + timedelta(hours=1))
    with pytest.raises(Exception, match="invalid or has expired"):
        svc.reset_password(
            db, token2, NEW_PASSWORD, now=start + timedelta(hours=1) + svc.RESET_TOKEN_TTL
        )


def test_new_request_voids_older_links(db: Session, operator):
    start = datetime(2026, 11, 22, 12, 0, tzinfo=UTC)
    first, _ = svc.request_reset(db, "operator@example.test", now=start)
    second, _ = svc.request_reset(db, "operator@example.test", now=start + svc.RESEND_THROTTLE * 2)
    with pytest.raises(Exception, match="invalid or has expired"):
        svc.reset_password(db, first, NEW_PASSWORD, now=start + svc.RESEND_THROTTLE * 3)
    svc.reset_password(db, second, NEW_PASSWORD, now=start + svc.RESEND_THROTTLE * 3)


def test_one_email_per_minute_but_same_answer(client: TestClient, db: Session, operator, mailbox):
    first, second = (_forgot(client, "operator@example.test") for _ in range(2))
    assert first.json() == second.json() == {"message": NEUTRAL}
    assert len(mailbox.sent) == 1
    assert db.scalar(select(func.count()).select_from(PasswordResetToken)) == 1


def test_resend_allowed_after_the_throttle(db: Session, operator):
    start = datetime(2026, 11, 22, 12, 0, tzinfo=UTC)
    assert svc.request_reset(db, "operator@example.test", now=start)
    assert svc.request_reset(db, "operator@example.test", now=start + timedelta(seconds=30)) is None
    assert svc.request_reset(db, "operator@example.test", now=start + svc.RESEND_THROTTLE * 2)


@pytest.mark.parametrize("password", ["short", "x" * 129, ""])
def test_weak_or_oversized_password_is_422_and_link_survives(
    client: TestClient, operator, mailbox, password
):
    _forgot(client, "operator@example.test")
    token = _token_from(mailbox)
    res = _reset(client, token, password)
    assert res.status_code == 422
    assert password not in res.text or password == ""
    assert _reset(client, token).status_code == 200  # a typo does not burn the link


def test_password_equal_to_username_is_rejected(client: TestClient, operator, mailbox):
    _forgot(client, "operator@example.test")
    token = _token_from(mailbox)
    res = _reset(client, token, "Operator")  # 8 chars, equals the username ignoring case
    assert res.status_code == 422
    assert "different from the username" in res.json()["error"]["message"]
    assert _reset(client, token).status_code == 200


def test_reset_signs_out_older_sessions(client: TestClient, db: Session, operator, mailbox):
    old_token, _ = create_access_token(operator.id, now=datetime.now(UTC) - timedelta(minutes=5))
    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"}).status_code
        == 200
    )

    _forgot(client, "operator@example.test")
    _reset(client, _token_from(mailbox))

    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"}).status_code
        == 401
    )
    new = _login(client, "operator", NEW_PASSWORD).json()["access_token"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {new}"}).status_code == 200


def test_reset_votes_out_other_pending_links_of_the_user(db: Session, operator):
    start = datetime(2026, 11, 22, 12, 0, tzinfo=UTC)
    token, _ = svc.request_reset(db, "operator@example.test", now=start)
    svc.reset_password(db, token, NEW_PASSWORD, now=start + timedelta(minutes=1))
    unused = db.scalar(
        select(func.count())
        .select_from(PasswordResetToken)
        .where(PasswordResetToken.used_at.is_(None))
    )
    assert unused == 0


def test_reset_only_touches_that_user(client: TestClient, create_user, operator, mailbox):
    create_user("other", email="other@example.test")
    _forgot(client, "operator@example.test")
    _reset(client, _token_from(mailbox))
    assert _login(client, "other", PASSWORD).status_code == 200


def test_send_failure_does_not_change_the_answer(client: TestClient, operator, monkeypatch, caplog):
    class Broken:
        def send(self, *_):
            raise OSError("smtp down")

    monkeypatch.setattr("app.routers.auth.get_mailer", lambda settings: Broken())
    res = _forgot(client, "operator@example.test")
    assert res.status_code == 202 and res.json() == {"message": NEUTRAL}
    assert "Could not send the password-reset email" in caplog.text


def test_user_deleted_after_request_cascades_tokens(db: Session, operator):
    svc.request_reset(db, "operator@example.test")
    db.delete(db.get(User, operator.id))
    db.commit()
    assert db.scalar(select(func.count()).select_from(PasswordResetToken)) == 0
