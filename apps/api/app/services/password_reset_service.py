"""Forgot-password rules: issue one-time links, and use one to set a new password."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.errors import validation_error
from app.core.security import hash_password, hash_reset_token, new_reset_token
from app.models import PasswordResetToken, User

RESET_TOKEN_TTL = timedelta(minutes=30)
RESEND_THROTTLE = timedelta(seconds=60)
INVALID_LINK = "This reset link is invalid or has expired."


def request_reset(
    session: Session, email: str, now: datetime | None = None
) -> tuple[str, User] | None:
    """Create a link token for the user with this email.

    Returns ``(token, user)`` when an email should be sent, or ``None`` (unknown email, or one was
    already sent in the last minute). The caller answers identically in every case.
    """
    now = now or datetime.now(UTC)
    user = session.scalar(select(User).where(User.email == email))
    if user is None or _sent_recently(session, user.id, now):
        return None
    _void_unused_tokens(session, user.id, now)
    token = new_reset_token()
    session.add(
        PasswordResetToken(
            token_hash=hash_reset_token(token),
            user_id=user.id,
            created_at=now,
            expires_at=now + RESET_TOKEN_TTL,
        )
    )
    session.commit()
    return token, user


def reset_password(
    session: Session, token: str, new_password: str, now: datetime | None = None
) -> None:
    """Set a new password with a valid, unused link. Raises 422 for any bad link."""
    now = now or datetime.now(UTC)
    row = session.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == hash_reset_token(token))
        .with_for_update()  # two requests with the same link cannot both succeed
    )
    if row is None or row.used_at is not None or row.expires_at <= now:
        raise validation_error(INVALID_LINK)
    user = session.get(User, row.user_id)
    if new_password.lower() == user.username:
        raise validation_error("The password must be different from the username.")
    user.password_hash = hash_password(new_password)
    user.password_changed_at = now
    _void_unused_tokens(session, user.id, now)
    session.commit()


def _sent_recently(session: Session, user_id: str, now: datetime) -> bool:
    count = session.scalar(
        select(func.count())
        .select_from(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.created_at > now - RESEND_THROTTLE,
        )
    )
    return bool(count)


def _void_unused_tokens(session: Session, user_id: str, now: datetime) -> None:
    session.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user_id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
