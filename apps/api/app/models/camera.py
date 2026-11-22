from datetime import datetime

from nigehban_contracts import IdPrefix, new_id
from sqlalchemy import String, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import ID_LENGTH, Base, created_at_column
from app.db.checks import id_format


class Camera(Base):
    __tablename__ = "cameras"
    __table_args__ = (id_format("id", IdPrefix.CAMERA),)

    id: Mapped[str] = mapped_column(
        String(ID_LENGTH), primary_key=True, default=lambda: new_id(IdPrefix.CAMERA)
    )
    name: Mapped[str] = mapped_column(String(64), unique=True)
    location: Mapped[str] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(server_default=true())
    created_at: Mapped[datetime] = created_at_column()
