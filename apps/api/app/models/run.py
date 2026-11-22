from datetime import datetime

from nigehban_contracts import EventSource, IdPrefix, RunStatus, new_id
from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import ID_LENGTH, Base, created_at_column
from app.db.checks import id_format, in_enum


class Run(Base):
    __tablename__ = "runs"
    __table_args__ = (
        id_format("id", IdPrefix.RUN),
        in_enum("source", EventSource),
        in_enum("status", RunStatus),
        # D-06: mock output is always demo data, real output never is.
        CheckConstraint("is_demo = (source = 'mock')", name="is_demo_matches_source"),
        CheckConstraint("frames_processed >= 0", name="frames_processed_non_negative"),
        CheckConstraint("fps >= 0", name="fps_non_negative"),
        CheckConstraint(
            "ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at",
            name="ended_after_started",
        ),
        Index("ix_runs_camera_id", "camera_id"),
    )

    id: Mapped[str] = mapped_column(
        String(ID_LENGTH), primary_key=True, default=lambda: new_id(IdPrefix.RUN)
    )
    camera_id: Mapped[str] = mapped_column(ForeignKey("cameras.id", ondelete="RESTRICT"))
    source: Mapped[str] = mapped_column(String(8))
    video_path: Mapped[str] = mapped_column(String(255))  # relative to DATA_DIR/videos
    status: Mapped[str] = mapped_column(String(16))
    is_demo: Mapped[bool]
    pid: Mapped[int | None]
    frames_processed: Mapped[int] = mapped_column(server_default="0")
    fps: Mapped[float] = mapped_column(server_default="0")
    message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None]
    ended_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = created_at_column()
