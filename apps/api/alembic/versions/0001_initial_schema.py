"""Initial schema: users, cameras, runs, alerts, alert_actions (see docs/Backend.md).

Revision ID: 0001
Revises:
Create Date: 2026-11-22 20:33:02.819253
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cameras",
        sa.Column("id", sa.String(length=30), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "id ~ '^cam_[0-9A-HJKMNP-TV-Z]{26}$'", name=op.f("ck_cameras_id_format")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cameras")),
        sa.UniqueConstraint("name", name=op.f("uq_cameras_name")),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=30), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("id ~ '^usr_[0-9A-HJKMNP-TV-Z]{26}$'", name=op.f("ck_users_id_format")),
        sa.CheckConstraint("role IN ('admin', 'operator')", name=op.f("ck_users_role_valid")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("username", name=op.f("uq_users_username")),
    )
    op.create_table(
        "runs",
        sa.Column("id", sa.String(length=30), nullable=False),
        sa.Column("camera_id", sa.String(length=30), nullable=False),
        sa.Column("source", sa.String(length=8), nullable=False),
        sa.Column("video_path", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        sa.Column("pid", sa.Integer(), nullable=True),
        sa.Column("frames_processed", sa.Integer(), server_default="0", nullable=False),
        sa.Column("fps", sa.Double(), server_default="0", nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("id ~ '^run_[0-9A-HJKMNP-TV-Z]{26}$'", name=op.f("ck_runs_id_format")),
        sa.CheckConstraint(
            "is_demo = (source = 'mock')", name=op.f("ck_runs_is_demo_matches_source")
        ),
        sa.CheckConstraint("source IN ('mock', 'real')", name=op.f("ck_runs_source_valid")),
        sa.CheckConstraint(
            "status IN ('completed', 'failed', 'queued', 'running', 'stopped')",
            name=op.f("ck_runs_status_valid"),
        ),
        sa.CheckConstraint(
            "ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at",
            name=op.f("ck_runs_ended_after_started"),
        ),
        sa.CheckConstraint("fps >= 0", name=op.f("ck_runs_fps_non_negative")),
        sa.CheckConstraint(
            "frames_processed >= 0", name=op.f("ck_runs_frames_processed_non_negative")
        ),
        sa.ForeignKeyConstraint(
            ["camera_id"],
            ["cameras.id"],
            name=op.f("fk_runs_camera_id_cameras"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_runs")),
    )
    op.create_index("ix_runs_camera_id", "runs", ["camera_id"], unique=False)
    op.create_table(
        "alerts",
        sa.Column("id", sa.String(length=30), nullable=False),
        sa.Column("ref_code", sa.String(length=20), nullable=False),
        sa.Column("event_id", sa.String(length=30), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        sa.Column("camera_id", sa.String(length=30), nullable=False),
        sa.Column("run_id", sa.String(length=30), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("video_ts_s", sa.Double(), nullable=False),
        sa.Column("bag_track_id", sa.Integer(), nullable=False),
        sa.Column("bag_class", sa.String(length=16), nullable=False),
        sa.Column("bag_bbox", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("owner_track_id", sa.Integer(), nullable=True),
        sa.Column("carrier_track_id", sa.Integer(), nullable=True),
        sa.Column("separation_s", sa.Double(), nullable=True),
        sa.Column("owner_distance_m", sa.Double(), nullable=True),
        sa.Column("owner_away_s", sa.Double(), nullable=True),
        sa.Column("confidence", sa.Double(), nullable=False),
        sa.Column("owner_match", sa.Double(), nullable=True),
        sa.Column("snapshot_path", sa.String(length=255), nullable=False),
        sa.Column("acknowledged_by", sa.String(length=30), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(status IN ('authorised_pickup', 'confirmed_theft', 'false_alarm', 'resolved')) = (closed_at IS NOT NULL)",
            name=op.f("ck_alerts_closed_at_set"),
        ),
        sa.CheckConstraint(
            "(type = 'abandoned_bag' AND right(ref_code, 1) = 'A') OR (type = 'possible_theft' AND right(ref_code, 1) = 'T')",
            name=op.f("ck_alerts_ref_code_matches_type"),
        ),
        sa.CheckConstraint(
            "bag_class IN ('backpack', 'handbag')", name=op.f("ck_alerts_bag_class_valid")
        ),
        sa.CheckConstraint(
            "event_id ~ '^evt_[0-9A-HJKMNP-TV-Z]{26}$'", name=op.f("ck_alerts_event_id_format")
        ),
        sa.CheckConstraint("id ~ '^alt_[0-9A-HJKMNP-TV-Z]{26}$'", name=op.f("ck_alerts_id_format")),
        sa.CheckConstraint(
            "jsonb_typeof(bag_bbox) = 'array' AND jsonb_array_length(bag_bbox) = 4",
            name=op.f("ck_alerts_bag_bbox_four_numbers"),
        ),
        sa.CheckConstraint(
            "ref_code ~ '^SEC-\\d{4}-\\d{3,}-[AT]$'", name=op.f("ck_alerts_ref_code_format")
        ),
        sa.CheckConstraint(
            "status <> 'acknowledged' OR (acknowledged_at IS NOT NULL AND acknowledged_by IS NOT NULL)",
            name=op.f("ck_alerts_acknowledged_fields"),
        ),
        sa.CheckConstraint(
            "status IN ('acknowledged', 'active', 'authorised_pickup', 'confirmed_theft', 'false_alarm', 'resolved')",
            name=op.f("ck_alerts_status_valid"),
        ),
        sa.CheckConstraint(
            "type <> 'abandoned_bag' OR (separation_s IS NOT NULL AND carrier_track_id IS NULL AND owner_away_s IS NULL AND owner_match IS NULL)",
            name=op.f("ck_alerts_abandoned_fields"),
        ),
        sa.CheckConstraint(
            "type <> 'possible_theft' OR (separation_s IS NULL AND carrier_track_id IS NOT NULL AND owner_away_s IS NOT NULL AND owner_match IS NOT NULL)",
            name=op.f("ck_alerts_theft_fields"),
        ),
        sa.CheckConstraint(
            "type = 'possible_theft' OR status NOT IN ('authorised_pickup', 'confirmed_theft')",
            name=op.f("ck_alerts_theft_only_statuses"),
        ),
        sa.CheckConstraint(
            "type IN ('abandoned_bag', 'possible_theft')", name=op.f("ck_alerts_type_valid")
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1", name=op.f("ck_alerts_confidence_unit")
        ),
        sa.CheckConstraint("owner_away_s >= 0", name=op.f("ck_alerts_owner_away_non_negative")),
        sa.CheckConstraint(
            "owner_distance_m >= 0", name=op.f("ck_alerts_owner_distance_non_negative")
        ),
        sa.CheckConstraint(
            "owner_match >= 0 AND owner_match <= 1", name=op.f("ck_alerts_owner_match_unit")
        ),
        sa.CheckConstraint("separation_s >= 0", name=op.f("ck_alerts_separation_non_negative")),
        sa.CheckConstraint("video_ts_s >= 0", name=op.f("ck_alerts_video_ts_non_negative")),
        sa.ForeignKeyConstraint(
            ["acknowledged_by"],
            ["users.id"],
            name=op.f("fk_alerts_acknowledged_by_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["camera_id"],
            ["cameras.id"],
            name=op.f("fk_alerts_camera_id_cameras"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["run_id"], ["runs.id"], name=op.f("fk_alerts_run_id_runs"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_alerts")),
        sa.UniqueConstraint("event_id", name=op.f("uq_alerts_event_id")),
        sa.UniqueConstraint("ref_code", name=op.f("uq_alerts_ref_code")),
    )
    op.create_index("ix_alerts_camera_id", "alerts", ["camera_id"], unique=False)
    op.create_index("ix_alerts_carrier_track_id", "alerts", ["carrier_track_id"], unique=False)
    op.create_index("ix_alerts_owner_track_id", "alerts", ["owner_track_id"], unique=False)
    op.create_index("ix_alerts_run_id", "alerts", ["run_id"], unique=False)
    op.create_index(
        "ix_alerts_status_occurred_at",
        "alerts",
        ["status", sa.literal_column("occurred_at DESC")],
        unique=False,
    )
    op.create_table(
        "alert_actions",
        sa.Column("id", sa.String(length=30), nullable=False),
        sa.Column("alert_id", sa.String(length=30), nullable=False),
        sa.Column("action", sa.String(length=16), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=False),
        sa.Column("to_status", sa.String(length=20), nullable=False),
        sa.Column("user_id", sa.String(length=30), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column(
            "at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.CheckConstraint(
            "action <> 'acknowledge' OR to_status = 'acknowledged'",
            name=op.f("ck_alert_actions_acknowledge_target"),
        ),
        sa.CheckConstraint(
            "action IN ('acknowledge', 'close')", name=op.f("ck_alert_actions_action_valid")
        ),
        sa.CheckConstraint(
            "from_status IN ('acknowledged', 'active', 'authorised_pickup', 'confirmed_theft', 'false_alarm', 'resolved')",
            name=op.f("ck_alert_actions_from_status_valid"),
        ),
        sa.CheckConstraint(
            "id ~ '^act_[0-9A-HJKMNP-TV-Z]{26}$'", name=op.f("ck_alert_actions_id_format")
        ),
        sa.CheckConstraint(
            "to_status IN ('acknowledged', 'active', 'authorised_pickup', 'confirmed_theft', 'false_alarm', 'resolved')",
            name=op.f("ck_alert_actions_to_status_valid"),
        ),
        sa.CheckConstraint(
            "from_status <> to_status", name=op.f("ck_alert_actions_status_changes")
        ),
        sa.ForeignKeyConstraint(
            ["alert_id"],
            ["alerts.id"],
            name=op.f("fk_alert_actions_alert_id_alerts"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_alert_actions_user_id_users"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_alert_actions")),
    )
    op.create_index(
        "ix_alert_actions_alert_id_at", "alert_actions", ["alert_id", "at"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_alert_actions_alert_id_at", table_name="alert_actions")
    op.drop_table("alert_actions")
    op.drop_index("ix_alerts_status_occurred_at", table_name="alerts")
    op.drop_index("ix_alerts_run_id", table_name="alerts")
    op.drop_index("ix_alerts_owner_track_id", table_name="alerts")
    op.drop_index("ix_alerts_carrier_track_id", table_name="alerts")
    op.drop_index("ix_alerts_camera_id", table_name="alerts")
    op.drop_table("alerts")
    op.drop_index("ix_runs_camera_id", table_name="runs")
    op.drop_table("runs")
    op.drop_table("users")
    op.drop_table("cameras")
