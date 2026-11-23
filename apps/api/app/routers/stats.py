"""Counters for the Dashboard and History tiles."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from nigehban_contracts import HistoryStats, Stats

from app.core.errors import ERROR_RESPONSES
from app.core.settings import Settings, get_settings
from app.routers.deps import CurrentUser, DbSession
from app.schemas.stats import HistoryStatsQuery
from app.services import stats_service

router = APIRouter(prefix="/api/stats", tags=["stats"], responses=ERROR_RESPONSES)


@router.get("", response_model=Stats)
def get_stats(
    db: DbSession, settings: Annotated[Settings, Depends(get_settings)], _: CurrentUser
) -> Stats:
    """Open alerts, today's alerts in the campus timezone, running runs and the newest alert."""
    return stats_service.dashboard_stats(db, datetime.now(UTC), settings.campus_tz)


@router.get("/history", response_model=HistoryStats)
def get_history_stats(
    query: Annotated[HistoryStatsQuery, Query()], db: DbSession, _: CurrentUser
) -> HistoryStats:
    """Closed alerts in the last ``days`` days: count, false alarms and mean response time."""
    return stats_service.history_stats(db, datetime.now(UTC), query.days, query.type)
