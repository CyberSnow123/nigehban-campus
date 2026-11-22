from datetime import datetime

from nigehban_contracts import ActionType, AlertStatus, IdPrefix, new_id
from sqlalchemy import CheckConstraint, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import ID_LENGTH, Base
from app.db.checks import id_format, in_enum

NOTE_MAX_LENGTH = 500  # Data-Contracts §6 (CloseRequest.note)


class AlertAction(Base):
    """Audit trail: one row per status change, written in the same transaction."""

    __tablename__ = "alert_actions"
    __table_args__ = (
        id_format("id", IdPrefix.ACTION),
        in_enum("action", ActionType),
        in_enum("from_status", AlertStatus),
        in_enum("to_status", AlertStatus),
        CheckConstraint("from_status <> to_status", name="status_changes"),
        CheckConstraint(
            f"action <> '{ActionType.ACKNOWLEDGE.value}'"
            f" OR to_status = '{AlertStatus.ACKNOWLEDGED.value}'",
            name="acknowledge_target",
        ),
        Index("ix_alert_actions_alert_id_at", "alert_id", "at"),
    )

    id: Mapped[str] = mapped_column(
        String(ID_LENGTH), primary_key=True, default=lambda: new_id(IdPrefix.ACTION)
    )
    alert_id: Mapped[str] = mapped_column(ForeignKey("alerts.id", ondelete="RESTRICT"))
    action: Mapped[str] = mapped_column(String(16))
    from_status: Mapped[str] = mapped_column(String(20))
    to_status: Mapped[str] = mapped_column(String(20))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    note: Mapped[str | None] = mapped_column(String(NOTE_MAX_LENGTH))
    at: Mapped[datetime] = mapped_column(server_default=func.now())
