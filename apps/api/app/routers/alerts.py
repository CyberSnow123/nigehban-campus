"""Operator alert routes: list, detail, snapshot, audit trail, acknowledge, close."""

from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse
from nigehban_contracts import Alert, AlertAction, CloseRequest, Page

from app.core.errors import ALERT_ERROR_RESPONSES
from app.routers.deps import CurrentUser, DbSession
from app.schemas.alerts import AlertListQuery
from app.services import alert_query, alert_service
from app.services.storage import StorageDep

router = APIRouter(prefix="/api/alerts", tags=["alerts"], responses=ALERT_ERROR_RESPONSES)

# A snapshot never changes once stored; "private" keeps shared caches from holding it.
SNAPSHOT_CACHE = "private, max-age=3600"


@router.get("", response_model=Page[Alert])
def list_alerts(
    query: Annotated[AlertListQuery, Query()], db: DbSession, _: CurrentUser
) -> Page[Alert]:
    """Newest first. Filters combine with AND."""
    return alert_query.list_alerts(db, query)


@router.get("/{alert_id}", response_model=Alert)
def get_alert(alert_id: str, db: DbSession, _: CurrentUser) -> Alert:
    return alert_query.get_alert(db, alert_id)


@router.get(
    "/{alert_id}/snapshot",
    response_class=FileResponse,
    responses={200: {"content": {"image/jpeg": {}}, "description": "The alert's snapshot"}},
)
def get_snapshot(alert_id: str, db: DbSession, storage: StorageDep, _: CurrentUser) -> FileResponse:
    path = alert_query.snapshot_file(db, storage, alert_id)
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": SNAPSHOT_CACHE})


@router.get("/{alert_id}/actions", response_model=list[AlertAction])
def get_actions(alert_id: str, db: DbSession, _: CurrentUser) -> list[AlertAction]:
    """The audit trail, oldest first."""
    return alert_query.list_actions(db, alert_id)


@router.post("/{alert_id}/acknowledge", response_model=Alert)
def acknowledge(alert_id: str, db: DbSession, user: CurrentUser) -> Alert:
    """``active`` -> ``acknowledged``. Anything else is 409 INVALID_TRANSITION."""
    alert_service.acknowledge(db, alert_id, user)
    return alert_query.get_alert(db, alert_id)


@router.post("/{alert_id}/close", response_model=Alert)
def close(alert_id: str, body: CloseRequest, db: DbSession, user: CurrentUser) -> Alert:
    """Close with an outcome. Which outcomes fit depends on the alert type (Data-Contracts §2)."""
    alert_service.close(db, alert_id, user, body)
    return alert_query.get_alert(db, alert_id)
