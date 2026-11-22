"""The first migration round-trips and matches the models and Backend.md §4."""

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import Engine, inspect

import app.models  # noqa: F401
from app.db.base import Base

# Backend.md §4, column for column.
EXPECTED_COLUMNS = {
    "users": {"id", "username", "display_name", "password_hash", "role", "created_at"},
    "cameras": {"id", "name", "location", "is_active", "created_at"},
    "runs": {
        "id", "camera_id", "source", "video_path", "status", "is_demo", "pid",
        "frames_processed", "fps", "message", "started_at", "ended_at", "created_at",
    },
    "alerts": {
        "id", "ref_code", "event_id", "type", "status", "is_demo", "camera_id", "run_id",
        "occurred_at", "video_ts_s", "bag_track_id", "bag_class", "bag_bbox", "owner_track_id",
        "carrier_track_id", "separation_s", "owner_distance_m", "owner_away_s", "confidence",
        "owner_match", "snapshot_path", "acknowledged_by", "acknowledged_at", "closed_at",
        "created_at",
    },
    "alert_actions": {
        "id", "alert_id", "action", "from_status", "to_status", "user_id", "note", "at",
    },
}  # fmt: skip

EXPECTED_INDEXES = {
    "alerts": {
        "ix_alerts_status_occurred_at",
        "ix_alerts_run_id",
        "ix_alerts_owner_track_id",
        "ix_alerts_carrier_track_id",
        "ix_alerts_camera_id",
    },
    "runs": {"ix_runs_camera_id"},
    "alert_actions": {"ix_alert_actions_alert_id_at"},
}


def test_tables_and_columns_match_backend_doc(engine: Engine):
    insp = inspect(engine)
    tables = set(insp.get_table_names()) - {"alembic_version"}
    assert tables == set(EXPECTED_COLUMNS)
    for table, columns in EXPECTED_COLUMNS.items():
        assert {c["name"] for c in insp.get_columns(table)} == columns, table


def test_indexes_and_uniques(engine: Engine):
    insp = inspect(engine)
    for table, names in EXPECTED_INDEXES.items():
        assert names <= {i["name"] for i in insp.get_indexes(table)}, table
    uniques = {
        (t, tuple(u["column_names"]))
        for t in EXPECTED_COLUMNS
        for u in insp.get_unique_constraints(t)
    }
    assert {
        ("users", ("username",)),
        ("cameras", ("name",)),
        ("alerts", ("ref_code",)),
        ("alerts", ("event_id",)),
    } <= uniques


def test_status_index_is_newest_first(engine: Engine):
    index = next(
        i
        for i in inspect(engine).get_indexes("alerts")
        if i["name"] == "ix_alerts_status_occurred_at"
    )
    assert index["column_sorting"] == {"occurred_at": ("desc",)}


def test_models_and_migration_agree(engine: Engine):
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diff == []


def test_upgrade_downgrade_upgrade(engine: Engine, alembic_cfg: Config):
    command.downgrade(alembic_cfg, "base")
    engine.dispose()  # drop pooled connections that cached the old schema
    assert set(inspect(engine).get_table_names()) <= {"alembic_version"}
    command.upgrade(alembic_cfg, "head")
    assert set(EXPECTED_COLUMNS) <= set(inspect(engine).get_table_names())
