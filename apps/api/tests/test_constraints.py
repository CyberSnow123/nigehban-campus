"""Check constraints reject rows the contracts forbid; valid rows are accepted.

Each rejection names the constraint that must fire, so a case can't pass by accident.
"""

from datetime import UTC, datetime

import pytest
from nigehban_contracts import AlertStatus, EventType, RunStatus
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.models import AlertAction, Camera, Run, User

THEFT = EventType.POSSIBLE_THEFT
ABANDONED = EventType.ABANDONED_BAG
NOW = datetime(2026, 11, 22, 15, 0, tzinfo=UTC)
STRING_TOO_LONG = "22001"  # Postgres SQLSTATE for an over-long varchar


def _rejects(db: Session, row, *expected: str) -> None:
    """The insert fails on one of ``expected`` (constraint names or a SQLSTATE).

    A savepoint keeps the fixture rows of the outer transaction."""
    with pytest.raises(DBAPIError) as info, db.begin_nested():
        db.add(row)
        db.flush()
    orig = info.value.orig
    assert {orig.diag.constraint_name, orig.sqlstate} & set(expected), orig


@pytest.mark.parametrize("event_type", [ABANDONED, THEFT])
def test_valid_alert_accepted(db: Session, make_alert, event_type):
    db.add(make_alert(event_type))
    db.flush()


@pytest.mark.parametrize("status", [s.value for s in AlertStatus])
def test_every_contract_status_accepted_on_theft(db: Session, make_alert, user, status):
    closed = status not in ("active", "acknowledged")
    db.add(
        make_alert(
            THEFT,
            status=status,
            acknowledged_by=user.id,
            acknowledged_at=NOW,
            closed_at=NOW if closed else None,
        )
    )
    db.flush()


@pytest.mark.parametrize(
    ("event_type", "overrides", "constraint"),
    [
        # Data-Contracts §3 type-conditional fields
        (ABANDONED, {"carrier_track_id": 12}, "abandoned_fields"),
        (ABANDONED, {"owner_away_s": 10.0}, "abandoned_fields"),
        (ABANDONED, {"owner_match": 0.5}, "abandoned_fields"),
        (ABANDONED, {"separation_s": None}, "abandoned_fields"),
        (THEFT, {"separation_s": 30.0}, "theft_fields"),
        (THEFT, {"carrier_track_id": None}, "theft_fields"),
        (THEFT, {"owner_away_s": None}, "theft_fields"),
        (THEFT, {"owner_match": None}, "theft_fields"),
        # enums
        (ABANDONED, {"status": "closed"}, "status_valid"),
        (ABANDONED, {"bag_class": "suitcase"}, "bag_class_valid"),
        # theft-only outcomes
        (ABANDONED, {"status": "confirmed_theft", "closed_at": NOW}, "theft_only_statuses"),
        (ABANDONED, {"status": "authorised_pickup", "closed_at": NOW}, "theft_only_statuses"),
        # ranges
        (THEFT, {"confidence": 1.01}, "confidence_unit"),
        (THEFT, {"confidence": -0.1}, "confidence_unit"),
        (THEFT, {"owner_match": 1.5}, "owner_match_unit"),
        (THEFT, {"video_ts_s": -1.0}, "video_ts_non_negative"),
        (THEFT, {"owner_distance_m": -1.0}, "owner_distance_non_negative"),
        (THEFT, {"owner_away_s": -1.0}, "owner_away_non_negative"),
        (ABANDONED, {"separation_s": -1.0}, "separation_non_negative"),
        (THEFT, {"bag_bbox": [1, 2, 3]}, "bag_bbox_four_numbers"),
        (THEFT, {"bag_bbox": {"x1": 1}}, "bag_bbox_four_numbers"),
        # IDs and ref codes
        (THEFT, {"id": "run_01JD2X0000000000000000000A"}, "id_format"),
        (THEFT, {"event_id": "alt_01JD2X0000000000000000000A"}, "event_id_format"),
        (THEFT, {"event_id": "evt_01jd2x0000000000000000000a"}, "event_id_format"),
        (THEFT, {"ref_code": "SEC-26-001-T"}, "ref_code_format"),
        (THEFT, {"ref_code": "SEC-2026-001-A"}, "ref_code_matches_type"),
        (ABANDONED, {"ref_code": "SEC-2026-001-T"}, "ref_code_matches_type"),
        # lifecycle
        (THEFT, {"status": "resolved"}, "closed_at_set"),  # closed without closed_at
        (THEFT, {"closed_at": NOW}, "closed_at_set"),  # open with closed_at
        (THEFT, {"status": "acknowledged"}, "acknowledged_fields"),  # no acknowledged_at/by
    ],
)
def test_invalid_alert_rejected(db: Session, make_alert, event_type, overrides, constraint):
    _rejects(db, make_alert(event_type, **overrides), f"ck_alerts_{constraint}")


def test_unknown_alert_type_rejected_by_type_check(db: Session, make_alert):
    # An unknown type also breaks ref_code_matches_type, which Postgres may report first,
    # so check the type constraint on its own.
    db.add(make_alert(THEFT))
    db.flush()
    with pytest.raises(DBAPIError) as info, db.begin_nested():
        db.execute(text("ALTER TABLE alerts DROP CONSTRAINT ck_alerts_ref_code_matches_type"))
        db.execute(text("UPDATE alerts SET type = 'theft'"))
    assert info.value.orig.diag.constraint_name == "ck_alerts_type_valid"


def test_event_id_and_ref_code_unique(db: Session, make_alert):
    first = make_alert(THEFT)
    db.add(first)
    db.flush()
    duplicate_event = make_alert(THEFT, event_id=first.event_id, ref_code="SEC-2026-002-T")
    _rejects(db, duplicate_event, "uq_alerts_event_id")
    _rejects(db, make_alert(THEFT, ref_code=first.ref_code), "uq_alerts_ref_code")


def test_run_is_demo_must_match_source(db: Session, camera: Camera):
    base = {"camera_id": camera.id, "video_path": "a.mp4", "status": RunStatus.QUEUED.value}
    _rejects(db, Run(source="mock", is_demo=False, **base), "ck_runs_is_demo_matches_source")
    _rejects(db, Run(source="real", is_demo=True, **base), "ck_runs_is_demo_matches_source")
    db.add(Run(source="real", is_demo=False, **base))
    db.flush()


@pytest.mark.parametrize(
    ("overrides", "constraint"),
    [
        ({"status": "paused"}, "ck_runs_status_valid"),
        ({"source": "live"}, "ck_runs_source_valid"),
        ({"frames_processed": -1}, "ck_runs_frames_processed_non_negative"),
        ({"fps": -0.5}, "ck_runs_fps_non_negative"),
        ({"started_at": NOW, "ended_at": NOW.replace(month=1)}, "ck_runs_ended_after_started"),
        ({"camera_id": "cam_01JD2X0000000000000000000A"}, "fk_runs_camera_id_cameras"),
    ],
)  # fmt: skip
def test_invalid_run_rejected(db: Session, camera: Camera, overrides, constraint):
    values = {"camera_id": camera.id, "source": "real", "is_demo": False}
    values |= {"video_path": "a.mp4", "status": "running"} | overrides
    _rejects(db, Run(**values), constraint)


def test_user_role_and_unique_username(db: Session, user: User):
    bad_role = User(username="x", display_name="X", password_hash="h", role="guard")
    _rejects(db, bad_role, "ck_users_role_valid")
    same_name = User(username=user.username, display_name="Y", password_hash="h", role="admin")
    _rejects(db, same_name, "uq_users_username")


def test_camera_name_unique(db: Session, camera: Camera):
    _rejects(db, Camera(name=camera.name, location="Elsewhere"), "uq_cameras_name")


@pytest.mark.parametrize(
    ("overrides", "expected"),
    [
        ({"action": "reopen"}, "ck_alert_actions_action_valid"),
        ({"from_status": "active", "to_status": "active"}, "ck_alert_actions_status_changes"),
        ({"action": "acknowledge", "to_status": "resolved"}, "ck_alert_actions_acknowledge_target"),
        ({"from_status": "open"}, "ck_alert_actions_from_status_valid"),
        ({"note": "x" * 501}, STRING_TOO_LONG),
    ],
)
def test_invalid_alert_action_rejected(db: Session, make_alert, user: User, overrides, expected):
    alert = make_alert(THEFT)
    db.add(alert)
    db.flush()
    values = {"alert_id": alert.id, "user_id": user.id, "action": "close"}
    values |= {"from_status": "active", "to_status": "resolved"} | overrides
    _rejects(db, AlertAction(**values), expected)
