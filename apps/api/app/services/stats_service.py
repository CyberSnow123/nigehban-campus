"""Dashboard and History counters (Data-Contracts.md §5: Stats, HistoryStats).

The clock is passed in, so tests can fix "now" and check the edges of "today"."""

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from nigehban_contracts import (
    CLOSED_STATUSES,
    OPEN_STATUSES,
    AlertStatus,
    EventType,
    HistoryStats,
    LatestAlert,
    RunStatus,
    Stats,
)
from sqlalchemy import ColumnElement, and_, func, select
from sqlalchemy.orm import Session

from app.models import Alert, Camera, Run

_OPEN = [s.value for s in OPEN_STATUSES]
_CLOSED = [s.value for s in CLOSED_STATUSES]


def today_bounds(now: datetime, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """Local midnight to the next local midnight, as aware datetimes (DST-safe)."""
    local_day = now.astimezone(tz).date()
    start = datetime.combine(local_day, time.min, tzinfo=tz)
    end = datetime.combine(local_day + timedelta(days=1), time.min, tzinfo=tz)
    return start, end


def _count(condition: ColumnElement[bool]) -> ColumnElement[int]:
    return func.count().filter(condition)


def _between(column, start: datetime, end: datetime) -> ColumnElement[bool]:
    return and_(column >= start, column < end)


def _latest_alert(db: Session) -> LatestAlert | None:
    """The alert the API stored last. Ordered by ``created_at``, not ``occurred_at``: events from
    recorded footage can carry an older time, and a new one must still count as new."""
    row = db.execute(
        select(Alert.id, Alert.ref_code, Alert.type, Camera.name)
        .join(Camera, Camera.id == Alert.camera_id)
        .order_by(Alert.created_at.desc(), Alert.id.desc())
        .limit(1)
    ).first()
    if row is None:
        return None
    return LatestAlert(id=row.id, ref_code=row.ref_code, type=row.type, camera_name=row.name)


def dashboard_stats(db: Session, now: datetime, tz: ZoneInfo) -> Stats:
    start, end = today_bounds(now, tz)
    counts = db.execute(
        select(
            _count(Alert.status.in_(_OPEN)).label("open_total"),
            _count(Alert.status == AlertStatus.ACTIVE.value).label("active"),
            _count(Alert.status == AlertStatus.ACKNOWLEDGED.value).label("acknowledged"),
            _count(
                and_(
                    Alert.type == EventType.ABANDONED_BAG.value,
                    _between(Alert.occurred_at, start, end),
                )
            ).label("today_abandoned"),
            _count(
                and_(
                    Alert.type == EventType.POSSIBLE_THEFT.value,
                    _between(Alert.occurred_at, start, end),
                )
            ).label("today_theft"),
            _count(_between(Alert.closed_at, start, end)).label("closed_today"),
        )
    ).one()
    running = db.scalar(
        select(func.count()).select_from(Run).where(Run.status == RunStatus.RUNNING.value)
    )
    return Stats(
        **counts._asdict(),
        running_runs=running or 0,
        latest_alert=_latest_alert(db),
    )


def history_stats(
    db: Session, now: datetime, days: int, event_type: EventType | None = None
) -> HistoryStats:
    """Closed alerts that occurred in the last ``days`` days. Response = raised -> first action."""
    first_action = func.coalesce(Alert.acknowledged_at, Alert.closed_at)
    response_s = func.greatest(func.extract("epoch", first_action - Alert.created_at), 0)
    conditions = [Alert.status.in_(_CLOSED), Alert.occurred_at >= now - timedelta(days=days)]
    if event_type is not None:
        conditions.append(Alert.type == event_type.value)
    row = db.execute(
        select(
            func.count().label("total"),
            _count(Alert.status == AlertStatus.FALSE_ALARM.value).label("false_alarms"),
            func.avg(response_s).label("avg_response_s"),
        ).where(*conditions)
    ).one()
    average = row.avg_response_s
    return HistoryStats(
        total=row.total,
        false_alarms=row.false_alarms,
        avg_response_s=None if average is None else round(float(average), 1),
    )
