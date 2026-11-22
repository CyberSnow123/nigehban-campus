from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import Engine

from app.db.session import database_is_up, get_engine
from app.schemas.health import HealthResponse

router = APIRouter(prefix="/api", tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    responses={503: {"model": HealthResponse, "description": "Database unreachable"}},
)
def health(response: Response, engine: Annotated[Engine, Depends(get_engine)]) -> HealthResponse:
    """Liveness plus a ``SELECT 1`` database check. No auth, no error details."""
    if database_is_up(engine):
        return HealthResponse(status="ok", database="connected")
    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return HealthResponse(status="degraded", database="disconnected")
