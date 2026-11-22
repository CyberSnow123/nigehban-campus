"""Login and the user shape returned to clients."""

from nigehban_contracts import UserMe
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import unauthorized
from app.core.security import DUMMY_HASH, verify_password
from app.models import User

BAD_LOGIN = "Invalid username or password."


def authenticate(session: Session, username: str, password: str) -> User:
    """Return the user, or raise a 401 that is identical for an unknown user and a bad password.

    A password check runs even for an unknown username, so the response time does not show
    which usernames exist.
    """
    user = session.scalar(select(User).where(User.username == username.lower()))
    password_ok = verify_password(password, user.password_hash if user else DUMMY_HASH)
    if user is None or not password_ok:
        raise unauthorized(BAD_LOGIN)
    return user


def to_user_me(user: User) -> UserMe:
    return UserMe(
        id=user.id, username=user.username, display_name=user.display_name, role=user.role
    )
