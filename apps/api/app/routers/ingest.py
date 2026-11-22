"""The only door from the CV worker into the system (D-11). Every route needs ``X-Worker-Key``."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile, status
from nigehban_contracts import (
    DetectionEvent,
    IngestEventResponse,
    IngestRunCreate,
    Run,
    RunStatusUpdate,
)
from pydantic import ValidationError

from app.core.errors import INGEST_ERROR_RESPONSES, field_messages, validation_error
from app.routers.deps import DbSession, require_worker
from app.services import ingest_service, run_service
from app.services.storage import StorageDep, read_jpeg

router = APIRouter(
    prefix="/api/ingest",
    tags=["ingest"],
    dependencies=[Depends(require_worker)],
    responses=INGEST_ERROR_RESPONSES,
)


@router.post("/runs", response_model=Run, status_code=status.HTTP_201_CREATED)
def create_run(body: IngestRunCreate, db: DbSession) -> Run:
    """Register a run started from the CLI. It starts as ``running``."""
    return run_service.to_run(run_service.create_run(db, body))


@router.post("/runs/{run_id}/status", response_model=Run)
def post_status(run_id: str, body: RunStatusUpdate, db: DbSession) -> Run:
    """Heartbeat (``running``) or final status. Terminal runs answer 409 RUN_NOT_RUNNING."""
    return run_service.to_run(run_service.apply_status(db, run_id, body))


@router.post("/runs/{run_id}/frame", status_code=status.HTTP_204_NO_CONTENT)
def post_frame(
    run_id: str,
    frame: Annotated[UploadFile, File(description="Latest annotated frame, JPEG, max 2 MB")],
    db: DbSession,
    storage: StorageDep,
) -> Response:
    run_service.require_running(run_service.get_run(db, run_id))
    storage.save_frame(run_id, read_jpeg(frame.file, "frame"))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/events",
    response_model=IngestEventResponse,
    status_code=status.HTTP_201_CREATED,
    responses={200: {"model": IngestEventResponse, "description": "Already received (duplicate)"}},
)
def post_event(
    event: Annotated[str, Form(description="DetectionEvent as JSON (Data-Contracts §3)")],
    snapshot: Annotated[UploadFile, File(description="Alert snapshot, JPEG, max 2 MB")],
    response: Response,
    db: DbSession,
    storage: StorageDep,
) -> IngestEventResponse:
    """New event: 201 and a new alert. Resent ``event_id``: 200 with ``duplicate: true``."""
    result = ingest_service.ingest_event(db, storage, _parse_event(event), snapshot.file)
    if result.duplicate:
        response.status_code = status.HTTP_200_OK
    return result


def _parse_event(raw: str) -> DetectionEvent:
    try:
        return DetectionEvent.model_validate_json(raw)
    except ValidationError as exc:
        raise validation_error(field_messages(exc.errors(), prefix="event")) from None
