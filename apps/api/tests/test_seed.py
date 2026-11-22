"""The seed is idempotent and only creates valid, clearly-labelled demo data."""

from collections import defaultdict
from pathlib import Path

from nigehban_contracts import (
    OPEN_STATUSES,
    AlertStatus,
    IdPrefix,
    can_transition,
    is_valid_id,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models import Alert, AlertAction, Camera, Run, User
from app.seed import data
from app.seed.runner import PLACEHOLDER_SNAPSHOT, seed, stable_id

MODELS = {
    "users": User,
    "cameras": Camera,
    "runs": Run,
    "alerts": Alert,
    "alert_actions": AlertAction,
}


def _counts(db: Session) -> dict[str, int]:
    return {name: db.scalar(select(func.count()).select_from(m)) for name, m in MODELS.items()}


def test_seed_twice_creates_no_duplicates(db: Session, tmp_data_dir: Path):
    first = seed(db, tmp_data_dir)
    after_first = _counts(db)
    second = seed(db, tmp_data_dir)

    assert after_first == {"users": 2, "cameras": 4, "runs": 4, "alerts": 8, "alert_actions": 9}
    assert dict(first) == after_first
    assert sum(second.values()) == 0
    assert _counts(db) == after_first


def test_seed_keeps_existing_rows(db: Session, tmp_data_dir: Path):
    seed(db, tmp_data_dir)
    operator = db.scalar(select(User).where(User.username == "operator"))
    operator.display_name = "Renamed"
    db.commit()
    seed(db, tmp_data_dir)
    db.refresh(operator)
    assert operator.display_name == "Renamed"


def test_users_and_cameras(db: Session, tmp_data_dir: Path):
    seed(db, tmp_data_dir)
    users = {u.username: u for u in db.scalars(select(User))}
    assert users["operator"].role == "operator" and users["admin"].role == "admin"
    assert users["operator"].email == "operator@nigehban.local"  # placeholder, never a real address
    assert users["admin"].email == "admin@nigehban.local"
    assert verify_password("operator123", users["operator"].password_hash)
    assert not verify_password("wrong", users["admin"].password_hash)
    cams = {c.name: c.location for c in db.scalars(select(Camera))}
    assert cams == {
        "CAM 01": "Main Gate Corridor",
        "CAM 02": "Library Entrance",
        "CAM 03": "Cafeteria Hall",
        "CAM 04": "Admin Block Lobby",
    }


def test_all_seeded_alerts_and_runs_are_demo(db: Session, tmp_data_dir: Path):
    seed(db, tmp_data_dir)
    assert all(r.is_demo and r.source == "mock" for r in db.scalars(select(Run)))
    alerts = list(db.scalars(select(Alert)))
    assert alerts and all(a.is_demo for a in alerts)
    assert {a.status for a in alerts} & OPEN_STATUSES  # dashboard has something open


def test_ref_codes_follow_time_order(db: Session, tmp_data_dir: Path):
    seed(db, tmp_data_dir)
    alerts = db.scalars(select(Alert).order_by(Alert.occurred_at)).all()
    numbers = [int(a.ref_code.split("-")[2]) for a in alerts]
    assert numbers == list(range(1, len(alerts) + 1))
    assert all(a.ref_code.endswith("-T" if a.type == "possible_theft" else "-A") for a in alerts)


def test_audit_trail_replays_to_current_status(db: Session, tmp_data_dir: Path):
    seed(db, tmp_data_dir)
    actions = defaultdict(list)
    for act in db.scalars(select(AlertAction).order_by(AlertAction.at)):
        actions[act.alert_id].append(act)
    for alert in db.scalars(select(Alert)):
        status = AlertStatus.ACTIVE
        for act in actions[alert.id]:
            assert act.from_status == status
            assert can_transition(alert.type, status, act.to_status)
            status = AlertStatus(act.to_status)
        assert alert.status == status


def test_snapshots_written_and_restored(db: Session, tmp_data_dir: Path):
    seed(db, tmp_data_dir)
    paths = list(db.scalars(select(Alert.snapshot_path)))
    assert all(not Path(p).is_absolute() and p.startswith("snapshots/run_") for p in paths)
    files = [tmp_data_dir / p for p in paths]
    assert all(f.read_bytes() == PLACEHOLDER_SNAPSHOT.read_bytes() for f in files)
    files[0].unlink()
    seed(db, tmp_data_dir)
    assert files[0].exists()


def test_stable_ids_are_valid_and_deterministic():
    for prefix in IdPrefix:
        value = stable_id(prefix, "demo-01")
        assert is_valid_id(value, prefix)
        assert value == stable_id(prefix, "demo-01") != stable_id(prefix, "demo-02")


def test_seed_data_is_consistent():
    assert len(data.ALERTS) == 8
    assert len({a.key for a in data.ALERTS}) == len(data.ALERTS)
    assert {a.camera for a in data.ALERTS} <= {c.name for c in data.CAMERAS}
