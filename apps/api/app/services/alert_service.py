"""Alert writes: a new alert from a detection event (Phase 6), and the operator actions
acknowledge and close (Phase 7). Every status change writes an ``alert_actions`` row in the same
transaction, and only moves allowed by the contracts' transition table are made."""

from datetime import UTC, datetime

from nigehban_contracts import (
    ActionType,
    AlertStatus,
    CloseRequest,
    DetectionEvent,
    can_transition,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import invalid_transition, not_found
from app.models import Alert, AlertAction, Run, User

_STATUS_WORDS = {s: s.value.replace("_", " ") for s in AlertStatus}


def alert_from_event(event: DetectionEvent, run: Run, snapshot_path: str, ref_code: str) -> Alert:
    """A new ``active`` alert. ``is_demo`` comes from the run (D-06), never from the event."""
    return Alert(
        ref_code=ref_code,
        event_id=event.event_id,
        type=event.type.value,
        status=AlertStatus.ACTIVE.value,
        is_demo=run.is_demo,
        camera_id=run.camera_id,
        run_id=run.id,
        occurred_at=event.occurred_at,
        video_ts_s=event.video_ts_s,
        bag_track_id=event.bag.track_id,
        bag_class=event.bag.class_.value,
        bag_bbox=list(event.bag.bbox),
        owner_track_id=event.owner_track_id,
        carrier_track_id=event.carrier_track_id,
        separation_s=event.separation_s,
        owner_distance_m=event.owner_distance_m,
        owner_away_s=event.owner_away_s,
        confidence=event.confidence,
        owner_match=event.owner_match,
        snapshot_path=snapshot_path,
    )


def acknowledge(db: Session, alert_id: str, user: User) -> None:
    _change_status(db, alert_id, user, AlertStatus.ACKNOWLEDGED, ActionType.ACKNOWLEDGE)


def close(db: Session, alert_id: str, user: User, body: CloseRequest) -> None:
    _change_status(db, alert_id, user, body.outcome, ActionType.CLOSE, body.note)


def _change_status(
    db: Session,
    alert_id: str,
    user: User,
    to_status: AlertStatus,
    action: ActionType,
    note: str | None = None,
) -> None:
    """Lock the row, check the move, update the alert and write the audit row, then commit.
    Two operators acting at once: the second waits for the lock, then gets a 409."""
    alert = db.scalar(select(Alert).where(Alert.id == alert_id).with_for_update())
    if alert is None:
        raise not_found("No alert with this ID.")
    from_status = AlertStatus(alert.status)
    if not can_transition(alert.type, from_status, to_status):
        db.rollback()
        raise invalid_transition(_refusal(from_status, to_status))

    now = datetime.now(UTC)
    alert.status = to_status.value
    if action is ActionType.ACKNOWLEDGE:
        alert.acknowledged_by = user.id
        alert.acknowledged_at = now
    else:
        alert.closed_at = now
    db.add(
        AlertAction(
            alert_id=alert.id,
            action=action.value,
            from_status=from_status.value,
            to_status=to_status.value,
            user_id=user.id,
            note=note or None,
            at=now,
        )
    )
    db.commit()


def _refusal(from_status: AlertStatus, to_status: AlertStatus) -> str:
    if from_status == to_status:
        return f"This alert is already {_STATUS_WORDS[from_status]}."
    return (
        f"This alert is {_STATUS_WORDS[from_status]} and cannot be marked "
        f"{_STATUS_WORDS[to_status]}."
    )
