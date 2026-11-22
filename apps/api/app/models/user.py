from datetime import datetime

from nigehban_contracts import IdPrefix, UserRole, new_id
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import ID_LENGTH, Base, created_at_column
from app.db.checks import id_format, in_enum


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        id_format("id", IdPrefix.USER),
        in_enum("role", UserRole),
    )

    id: Mapped[str] = mapped_column(
        String(ID_LENGTH), primary_key=True, default=lambda: new_id(IdPrefix.USER)
    )
    username: Mapped[str] = mapped_column(String(64), unique=True)
    display_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = created_at_column()
