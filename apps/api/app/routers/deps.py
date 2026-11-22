"""Shared route dependencies: who is calling, and are they an admin."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from nigehban_contracts import UserRole
from sqlalchemy.orm import Session

from app.core.errors import forbidden, unauthorized
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

_bearer = HTTPBearer(auto_error=False)  # our handler renders the 401, not FastAPI's
DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: DbSession,
) -> User:
    """The user behind the Bearer token. Loaded from the DB on every call, so a deleted user or
    a changed role takes effect at once."""
    if credentials is None:
        raise unauthorized()
    user_id, issued_at = decode_access_token(credentials.credentials)
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized("Invalid or expired token.")
    changed = user.password_changed_at
    # Token timestamps have whole-second precision, so compare at that precision.
    if changed is not None and issued_at < changed.replace(microsecond=0):
        raise unauthorized("Your password changed. Please log in again.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role != UserRole.ADMIN.value:
        raise forbidden()
    return user


AdminUser = Annotated[User, Depends(require_admin)]
