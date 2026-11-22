"""Monitoring runs as the worker reports them (Data-Contracts.md §4)."""

from datetime import UTC, datetime

from nigehban_contracts import (
    WORKER_RUN_STATUSES,
    EventSource,
    IngestRunCreate,
    RunStatus,
    RunStatusUpdate,
    can_update_run,
)
from nigehban_contracts import Run as RunModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import not_found, run_not_running, validation_error
from app.models import Camera, Run

_TERMINAL = WORKER_RUN_STATUSES - {RunStatus.RUNNING}


def to_run(run: Run) -> RunModel:
    return RunModel(
        id=run.id,
        camera_id=run.camera_id,
        source=run.source,
        video_path=run.video_path,
        status=run.status,
        is_demo=run.is_demo,
        frames_processed=run.frames_processed,
        fps=run.fps,
        started_at=run.started_at,
        ended_at=run.ended_at,
        message=run.message,
    )


def create_run(db: Session, body: IngestRunCreate) -> Run:
    """A standalone worker registers its own run. It is already running, so the run starts as
    ``running`` (Phase 12's UI-started runs start as ``queued``)."""
    camera = db.scalar(select(Camera).where(Camera.name == body.camera))
    if camera is None:
        raise not_found(f"No camera named {body.camera!r}.")
    if not camera.is_active:
        raise validation_error(f"camera: {body.camera!r} is switched off")
    run = Run(
        camera_id=camera.id,
        source=body.source.value,
        is_demo=body.source is EventSource.MOCK,  # D-06
        video_path=body.video_path,
        status=RunStatus.RUNNING.value,
        started_at=datetime.now(UTC),
    )
    db.add(run)
    db.commit()
    return run


def get_run(db: Session, run_id: str, lock: bool = False) -> Run:
    """The run, or a 404. ``lock`` holds its row until commit, so parallel status posts
    are applied one after the other."""
    stmt = select(Run).where(Run.id == run_id)
    run = db.scalar(stmt.with_for_update() if lock else stmt)
    if run is None:
        raise not_found("No run with this ID.")
    return run


def require_running(run: Run) -> None:
    if run.status != RunStatus.RUNNING.value:
        raise run_not_running(f"The run is {run.status}, not running.")


def apply_status(db: Session, run_id: str, update: RunStatusUpdate) -> Run:
    """Apply a heartbeat or a final status. Counters are totals, so they overwrite."""
    run = get_run(db, run_id, lock=True)
    if not can_update_run(RunStatus(run.status), update.status):
        db.rollback()
        raise run_not_running(f"The run is {run.status} and cannot become {update.status}.")
    now = datetime.now(UTC)
    run.status = update.status.value
    run.frames_processed = update.frames_processed
    if update.fps is not None:
        run.fps = update.fps
    run.message = update.message
    if update.status is RunStatus.RUNNING and run.started_at is None:
        run.started_at = now
    if update.status in _TERMINAL:
        run.ended_at = max(now, run.started_at) if run.started_at else now
    db.commit()
    return run
