"""Set the email address a user receives password-reset links at.

Usage (from apps/api): ``uv run python scripts/set_user_email.py operator you@example.com``
"""

import re
import sys

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.session import get_sessionmaker
from app.models import User

EMAIL_SHAPE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def main(argv: list[str]) -> None:
    if len(argv) != 3:
        sys.exit("Usage: set_user_email.py <username> <email>")
    username, email = argv[1].strip().lower(), argv[2].strip().lower()
    if not EMAIL_SHAPE.match(email) or len(email) > 254:
        sys.exit("That does not look like an email address.")
    with get_sessionmaker()() as session:
        user = session.scalar(select(User).where(User.username == username))
        if user is None:
            sys.exit(f"No user named '{username}'.")
        user.email = email
        try:
            session.commit()
        except IntegrityError:
            sys.exit("Another user already has that email address.")
    print(f"Email for '{username}' set.")  # the address is not echoed back


if __name__ == "__main__":
    main(sys.argv)
