"""Password hashing (argon2) and access tokens (HS256 JWT)."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.errors import unauthorized
from app.core.settings import get_settings

_hasher = PasswordHasher()
# Verified against when a username doesn't exist, so a miss costs the same time as a hit.
DUMMY_HASH = _hasher.hash("not-a-real-password")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def create_access_token(user_id: str, now: datetime | None = None) -> tuple[str, datetime]:
    """A signed token for ``user_id`` and the moment it expires. The role is not in the token."""
    settings = get_settings()
    issued = (now or datetime.now(UTC)).replace(microsecond=0)
    expires = issued + timedelta(hours=settings.jwt_expiry_hours)
    claims = {"sub": user_id, "iat": issued, "exp": expires}
    token = jwt.encode(claims, settings.jwt_secret.get_secret_value(), algorithm=ALGORITHM)
    return token, expires


def decode_access_token(token: str) -> tuple[str, datetime]:
    """Return ``(user_id, issued_at)``. Any problem is a 401 with one generic message."""
    try:
        claims = jwt.decode(
            token,
            get_settings().jwt_secret.get_secret_value(),
            algorithms=[ALGORITHM],
            options={"require": ["sub", "iat", "exp"]},
        )
    except jwt.PyJWTError:
        raise unauthorized("Invalid or expired token.") from None
    return claims["sub"], datetime.fromtimestamp(claims["iat"], UTC)


def new_reset_token() -> str:
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """Only this hash is stored; the token itself exists only in the email link."""
    return hashlib.sha256(token.encode()).hexdigest()
