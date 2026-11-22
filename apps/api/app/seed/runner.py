"""Idempotent dev seed. Rows are found by natural key or a stable ID and never overwritten."""

import hashlib
import shutil
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from nigehban_contracts import (
    ActionType,
    AlertStatus,
    EventSource,
    IdPrefix,
    RunStatus,
    can_transition,
)
from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from app.core.security import hash_password
from app.models import Alert, AlertAction, Camera, Run, User
from app.seed import data
from app.services.ref_codes import next_ref_code

PLACEHOLDER_SNAPSHOT = Path(__file__).parent / "assets" / "placeholder_snapshot.jpg"


def stable_id(prefix: IdPrefix, key: str) -> str:
    """A valid contract ID that is the same on every run for the same key."""
    digest = hashlib.sha256(f"nigehban-seed:{prefix.value}:{key}".encode()).digest()
    return f"{prefix.value}_{ULID.from_bytes(digest[:16])}"


def seed(session: Session, data_dir: Path, now: datetime | None = None) -> Counter[str]:
    """Insert whatever is missing and commit. Returns how many rows of each kind were created."""
    now = now or datetime.now(UTC)
    created: Counter[str] = Counter()
    users = _seed_users(session, created)
    cameras = _seed_cameras(session, created)
    runs = _seed_runs(session, cameras, now, created)
    _seed_alerts(session, cameras, runs, users, now, created)
    session.commit()
    _write_snapshots(session, data_dir)
    return created


def _seed_users(session: Session, created: Counter[str]) -> dict[str, User]:
    users: dict[str, User] = {}
    for spec in data.USERS:
        user = session.scalar(select(User).where(User.username == spec.username))
        if user is None:
            user = User(
                username=spec.username,
                email=spec.email,
                display_name=spec.display_name,
                password_hash=hash_password(spec.password),
                role=spec.role.value,
            )
            session.add(user)
            created["users"] += 1
        users[spec.username] = user
    session.flush()  # assigns IDs used by alert actions
    return users


def _seed_cameras(session: Session, created: Counter[str]) -> dict[str, Camera]:
    cameras: dict[str, Camera] = {}
    for spec in data.CAMERAS:
        camera = session.scalar(select(Camera).where(Camera.name == spec.name))
        if camera is None:
            camera = Camera(name=spec.name, location=spec.location, is_active=True)
            session.add(camera)
            created["cameras"] += 1
        cameras[spec.name] = camera
    session.flush()
    return cameras


def _seed_runs(
    session: Session, cameras: dict[str, Camera], now: datetime, created: Counter[str]
) -> dict[str, Run]:
    """One completed mock run per camera that has demo alerts."""
    runs: dict[str, Run] = {}
    for camera_name in sorted({a.camera for a in data.ALERTS}):
        run_id = stable_id(IdPrefix.RUN, camera_name)
        run = session.get(Run, run_id)
        if run is None:
            first = max(a.ago for a in data.ALERTS if a.camera == camera_name)
            run = Run(
                id=run_id,
                camera_id=cameras[camera_name].id,
                source=EventSource.MOCK.value,
                is_demo=True,
                video_path=data.DEMO_VIDEO.format(camera=camera_name.lower().replace(" ", "_")),
                status=RunStatus.COMPLETED.value,
                frames_processed=9000,
                fps=15.0,
                started_at=now - first - data.H,
                ended_at=now,
            )
            session.add(run)
            created["runs"] += 1
        runs[camera_name] = run
    session.flush()
    return runs


def _seed_alerts(
    session: Session,
    cameras: dict[str, Camera],
    runs: dict[str, Run],
    users: dict[str, User],
    now: datetime,
    created: Counter[str],
) -> None:
    # Oldest first, so ref_code numbers follow time order.
    for spec in sorted(data.ALERTS, key=lambda a: a.ago, reverse=True):
        alert_id = stable_id(IdPrefix.ALERT, spec.key)
        if session.get(Alert, alert_id) is not None:
            continue
        occurred_at = now - spec.ago
        alert = _new_alert(session, spec, alert_id, cameras, runs, occurred_at)
        session.add(alert)
        session.flush()
        created["alerts"] += 1
        created["alert_actions"] += _apply_path(session, alert, spec, users)
        session.flush()


def _new_alert(
    session: Session,
    spec: data.SeedAlert,
    alert_id: str,
    cameras: dict[str, Camera],
    runs: dict[str, Run],
    occurred_at: datetime,
) -> Alert:
    run = runs[spec.camera]
    event_id = stable_id(IdPrefix.EVENT, spec.key)
    return Alert(
        id=alert_id,
        ref_code=next_ref_code(session, occurred_at.year, spec.type),
        event_id=event_id,
        type=spec.type.value,
        status=AlertStatus.ACTIVE.value,
        is_demo=run.is_demo,
        camera_id=cameras[spec.camera].id,
        run_id=run.id,
        occurred_at=occurred_at,
        video_ts_s=spec.video_ts_s,
        bag_track_id=spec.bag_track_id,
        bag_class=spec.bag_class.value,
        bag_bbox=list(spec.bag_bbox),
        owner_track_id=spec.owner_track_id,
        carrier_track_id=spec.carrier_track_id,
        separation_s=spec.separation_s,
        owner_distance_m=spec.owner_distance_m,
        owner_away_s=spec.owner_away_s,
        confidence=spec.confidence,
        owner_match=spec.owner_match,
        snapshot_path=f"snapshots/{run.id}/{event_id}.jpg",
    )


def _apply_path(
    session: Session, alert: Alert, spec: data.SeedAlert, users: dict[str, User]
) -> int:
    """Walk the alert through ``spec.path`` with audit rows, obeying the transition table."""
    for to_status in spec.path:
        from_status = AlertStatus(alert.status)
        if not can_transition(spec.type, from_status, to_status):
            raise ValueError(f"seed {spec.key}: {from_status} -> {to_status} is not allowed")
        is_ack = to_status is AlertStatus.ACKNOWLEDGED
        at = alert.occurred_at + (data.ACK_DELAY if is_ack else data.CLOSE_DELAY)
        user = users["operator"] if is_ack else users["admin"]
        alert.status = to_status.value
        if is_ack:
            alert.acknowledged_by, alert.acknowledged_at = user.id, at
        else:
            alert.closed_at = at
        session.add(
            AlertAction(
                alert_id=alert.id,
                action=(ActionType.ACKNOWLEDGE if is_ack else ActionType.CLOSE).value,
                from_status=from_status.value,
                to_status=to_status.value,
                user_id=user.id,
                note=None if is_ack else spec.close_note,
                at=at,
            )
        )
    return len(spec.path)


def _write_snapshots(session: Session, data_dir: Path) -> None:
    """Copy the placeholder to every demo alert's snapshot path that has no file yet."""
    demo_ids = [stable_id(IdPrefix.ALERT, spec.key) for spec in data.ALERTS]
    for path in session.scalars(select(Alert.snapshot_path).where(Alert.id.in_(demo_ids))):
        target = data_dir / path
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(PLACEHOLDER_SNAPSHOT, target)
