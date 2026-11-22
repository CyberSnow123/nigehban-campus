from datetime import datetime
from typing import Any

from nigehban_contracts import (
    CLOSED_STATUSES,
    AlertStatus,
    BagClass,
    EventType,
    IdPrefix,
    allowed_outcomes,
    new_id,
)
from nigehban_contracts.ids import REF_CODE_PATTERN
from sqlalchemy import CheckConstraint, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import ID_LENGTH, Base, created_at_column
from app.db.checks import id_format, in_enum, in_values, sql_list

ABANDONED = EventType.ABANDONED_BAG.value
THEFT = EventType.POSSIBLE_THEFT.value
_THEFT_ONLY_STATUSES = sql_list(
    allowed_outcomes(EventType.POSSIBLE_THEFT) - allowed_outcomes(EventType.ABANDONED_BAG)
)
_CLOSED_STATUSES = sql_list(CLOSED_STATUSES)


def _type_field_rules() -> tuple[CheckConstraint, ...]:
    """Data-Contracts §3: which fields each event type must or must not carry."""
    return (
        CheckConstraint(
            f"type <> '{ABANDONED}' OR (separation_s IS NOT NULL AND carrier_track_id IS NULL"
            " AND owner_away_s IS NULL AND owner_match IS NULL)",
            name="abandoned_fields",
        ),
        CheckConstraint(
            f"type <> '{THEFT}' OR (separation_s IS NULL AND carrier_track_id IS NOT NULL"
            " AND owner_away_s IS NOT NULL AND owner_match IS NOT NULL)",
            name="theft_fields",
        ),
        CheckConstraint(
            f"type = '{THEFT}' OR status NOT IN ({_THEFT_ONLY_STATUSES})",
            name="theft_only_statuses",
        ),
        CheckConstraint(
            f"(type = '{ABANDONED}' AND right(ref_code, 1) = 'A')"
            f" OR (type = '{THEFT}' AND right(ref_code, 1) = 'T')",
            name="ref_code_matches_type",
        ),
    )


def _range_and_lifecycle_rules() -> tuple[CheckConstraint, ...]:
    return (
        CheckConstraint("video_ts_s >= 0", name="video_ts_non_negative"),
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="confidence_unit"),
        CheckConstraint("owner_match >= 0 AND owner_match <= 1", name="owner_match_unit"),
        CheckConstraint("separation_s >= 0", name="separation_non_negative"),
        CheckConstraint("owner_away_s >= 0", name="owner_away_non_negative"),
        CheckConstraint("owner_distance_m >= 0", name="owner_distance_non_negative"),
        CheckConstraint(
            "jsonb_typeof(bag_bbox) = 'array' AND jsonb_array_length(bag_bbox) = 4",
            name="bag_bbox_four_numbers",
        ),
        CheckConstraint(
            f"(status IN ({_CLOSED_STATUSES})) = (closed_at IS NOT NULL)", name="closed_at_set"
        ),
        CheckConstraint(
            f"status <> '{AlertStatus.ACKNOWLEDGED.value}'"
            " OR (acknowledged_at IS NOT NULL AND acknowledged_by IS NOT NULL)",
            name="acknowledged_fields",
        ),
    )


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        id_format("id", IdPrefix.ALERT),
        id_format("event_id", IdPrefix.EVENT),
        CheckConstraint(f"ref_code ~ '{REF_CODE_PATTERN}'", name="ref_code_format"),
        in_enum("type", EventType),
        in_enum("status", AlertStatus),
        in_values("bag_class", [c.value for c in BagClass]),
        *_type_field_rules(),
        *_range_and_lifecycle_rules(),
        Index("ix_alerts_run_id", "run_id"),
        Index("ix_alerts_camera_id", "camera_id"),
        Index("ix_alerts_owner_track_id", "owner_track_id"),
        Index("ix_alerts_carrier_track_id", "carrier_track_id"),
    )

    id: Mapped[str] = mapped_column(
        String(ID_LENGTH), primary_key=True, default=lambda: new_id(IdPrefix.ALERT)
    )
    ref_code: Mapped[str] = mapped_column(String(20), unique=True)
    event_id: Mapped[str] = mapped_column(String(ID_LENGTH), unique=True)
    type: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(20))
    is_demo: Mapped[bool]
    camera_id: Mapped[str] = mapped_column(ForeignKey("cameras.id", ondelete="RESTRICT"))
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id", ondelete="RESTRICT"))
    occurred_at: Mapped[datetime]
    video_ts_s: Mapped[float]
    bag_track_id: Mapped[int]
    bag_class: Mapped[str] = mapped_column(String(16))
    bag_bbox: Mapped[list[Any]] = mapped_column(JSONB)
    owner_track_id: Mapped[int | None]
    carrier_track_id: Mapped[int | None]
    separation_s: Mapped[float | None]
    owner_distance_m: Mapped[float | None]
    owner_away_s: Mapped[float | None]
    confidence: Mapped[float]
    owner_match: Mapped[float | None]
    snapshot_path: Mapped[str] = mapped_column(String(255))  # relative to DATA_DIR
    acknowledged_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    acknowledged_at: Mapped[datetime | None]
    closed_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = created_at_column()


# Alert list: filter by status, newest first (Backend §4).
Index("ix_alerts_status_occurred_at", Alert.status, Alert.occurred_at.desc())
