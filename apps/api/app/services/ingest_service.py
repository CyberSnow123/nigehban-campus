"""``POST /api/ingest/events``: one detection event plus snapshot becomes one alert.

Check order (Data-Contracts.md §4): duplicate first, then run, then camera and source, then the
snapshot. A lock on the ``event_id`` makes parallel retries run one after the other, so a resend
can never create a second alert or delete the first one's snapshot.
"""

from typing import BinaryIO

from nigehban_contracts import DetectionEvent, IngestEventResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import validation_error
from app.db.locks import EVENT_LOCK, advisory_xact_lock
from app.models import Alert, Run
from app.services import alert_service, run_service
from app.services.ref_codes import next_ref_code
from app.services.storage import Storage, read_jpeg


def ingest_event(
    db: Session, storage: Storage, event: DetectionEvent, snapshot: BinaryIO
) -> IngestEventResponse:
    advisory_xact_lock(db, EVENT_LOCK, event.event_id)
    existing = _alert_id_for(db, event.event_id)
    if existing is not None:
        db.rollback()  # releases the lock
        return IngestEventResponse(alert_id=existing, duplicate=True)

    run = run_service.get_run(db, event.run_id)
    run_service.require_running(run)
    _check_matches_run(event, run)
    data = read_jpeg(snapshot, "snapshot")
    return _store_alert(db, storage, event, run, data)


def _alert_id_for(db: Session, event_id: str) -> str | None:
    return db.scalar(select(Alert.id).where(Alert.event_id == event_id))


def _check_matches_run(event: DetectionEvent, run: Run) -> None:
    if event.camera_id != run.camera_id:
        raise validation_error("camera_id: does not match the run's camera")
    if event.source.value != run.source:  # a mock run can never produce a real alert (D-06)
        raise validation_error(f"source: the run is {run.source}, the event is {event.source}")


def _store_alert(
    db: Session, storage: Storage, event: DetectionEvent, run: Run, data: bytes
) -> IngestEventResponse:
    """Save the snapshot, then the row. If the row fails, the snapshot is removed again."""
    snapshot_path = storage.save_snapshot(run.id, event.event_id, data)
    try:
        ref_code = next_ref_code(db, event.occurred_at.year, event.type)
        alert = alert_service.alert_from_event(event, run, snapshot_path, ref_code)
        db.add(alert)
        db.commit()
    except IntegrityError:
        db.rollback()
        # Safety net behind the lock: another request stored this event first. The file at
        # this path is now that alert's snapshot, so it is kept.
        existing = _alert_id_for(db, event.event_id)
        if existing is not None:
            return IngestEventResponse(alert_id=existing, duplicate=True)
        storage.delete(snapshot_path)
        raise
    except Exception:
        db.rollback()
        storage.delete(snapshot_path)
        raise
    return IngestEventResponse(alert_id=alert.id, duplicate=False)
