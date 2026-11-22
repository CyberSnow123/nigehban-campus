from datetime import datetime

from nigehban_contracts import IdPrefix, UserRole, new_id
from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import ID_LENGTH, Base, created_at_column
from app.db.checks import id_format, in_enum


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        id_format("id", IdPrefix.USER),
        in_enum("role", UserRole),
        CheckConstraint("username = lower(username)", name="username_lowercase"),
        CheckConstraint("email = lower(email)", name="email_lowercase"),
    )

    id: Mapped[str] = mapped_column(
        String(ID_LENGTH), primary_key=True, default=lambda: new_id(IdPrefix.USER)
    )
    username: Mapped[str] = mapped_column(String(64), unique=True)
    display_name: Mapped[str] = mapped_column(String(120))
    # Used only to send password-reset links. Null = the user cannot reset by email.
    email: Mapped[str | None] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    # Tokens issued before this moment are rejected (set when the password is reset).
    password_changed_at: Mapped[datetime | None]
    role: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = created_at_column()
