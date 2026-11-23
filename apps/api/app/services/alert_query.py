"""Reading alerts: the filtered list, one alert, its audit trail and its snapshot file.
Rows are turned into the contract read models here (Data-Contracts.md §5)."""

from pathlib import Path

from nigehban_contracts import (
    CLOSED_STATUSES,
    OPEN_STATUSES,
    AlertStatus,
    BagInfo,
    CameraRef,
    Page,
    UserRef,
    next_statuses,
)
from nigehban_contracts import Alert as AlertModel
from nigehban_contracts import AlertAction as AlertActionModel
from sqlalchemy import ColumnElement, Select, func, or_, select
from sqlalchemy.orm import Session, aliased

from app.core.errors import not_found
from app.models import Alert, AlertAction, Camera, User
from app.schemas.alerts import AlertListQuery
from app.services.alert_search import search_condition
from app.services.storage import Storage

_Acknowledger = aliased(User)


def snapshot_url(alert_id: str) -> str:
    return f"/api/alerts/{alert_id}/snapshot"


def to_alert(alert: Alert, camera: Camera, acknowledger: User | None) -> AlertModel:
    return AlertModel(
        id=alert.id,
        ref_code=alert.ref_code,
        type=alert.type,
        status=alert.status,
        is_demo=alert.is_demo,
        camera=CameraRef(id=camera.id, name=camera.name, location=camera.location),
        run_id=alert.run_id,
        event_id=alert.event_id,
        occurred_at=alert.occurred_at,
        video_ts_s=alert.video_ts_s,
        bag=BagInfo(track_id=alert.bag_track_id, class_=alert.bag_class, bbox=alert.bag_bbox),
        owner_track_id=alert.owner_track_id,
        carrier_track_id=alert.carrier_track_id,
        separation_s=alert.separation_s,
        owner_distance_m=alert.owner_distance_m,
        owner_away_s=alert.owner_away_s,
        confidence=alert.confidence,
        owner_match=alert.owner_match,
        snapshot_url=snapshot_url(alert.id),
        next_statuses=next_statuses(alert.type, alert.status),
        acknowledged_by=_user_ref(acknowledger),
        acknowledged_at=alert.acknowledged_at,
        closed_at=alert.closed_at,
        created_at=alert.created_at,
    )


def _user_ref(user: User | None) -> UserRef | None:
    return UserRef(id=user.id, display_name=user.display_name) if user else None


def _with_camera_and_acknowledger() -> Select:
    return (
        select(Alert, Camera, _Acknowledger)
        .join(Camera, Camera.id == Alert.camera_id)
        .outerjoin(_Acknowledger, _Acknowledger.id == Alert.acknowledged_by)
    )


def get_alert(db: Session, alert_id: str) -> AlertModel:
    row = db.execute(_with_camera_and_acknowledger().where(Alert.id == alert_id)).first()
    if row is None:
        raise not_found("No alert with this ID.")
    return to_alert(*row)


# ---- list ------------------------------------------------------------------------------


def _status_condition(status: str) -> ColumnElement[bool]:
    if status == "open":
        return Alert.status.in_([s.value for s in OPEN_STATUSES])
    if status == "closed":
        return Alert.status.in_([s.value for s in CLOSED_STATUSES])
    return Alert.status == AlertStatus(status).value


def _conditions(query: AlertListQuery) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    if query.status is not None:
        conditions.append(_status_condition(query.status))
    if query.type is not None:
        conditions.append(Alert.type == query.type.value)
    if query.camera_id is not None:
        conditions.append(Alert.camera_id == query.camera_id)
    if query.run_id is not None:
        conditions.append(Alert.run_id == query.run_id)
    if query.person is not None:
        conditions.append(
            or_(Alert.owner_track_id == query.person, Alert.carrier_track_id == query.person)
        )
    if query.q is not None:
        conditions.append(search_condition(query.q))
    if query.from_ is not None:
        conditions.append(Alert.occurred_at >= query.from_)
    if query.to is not None:
        conditions.append(Alert.occurred_at <= query.to)
    if query.is_demo is not None:
        conditions.append(Alert.is_demo.is_(query.is_demo))
    return conditions


def list_alerts(db: Session, query: AlertListQuery) -> Page[AlertModel]:
    """Newest first. ``total`` counts every match, not just this page."""
    conditions = _conditions(query)
    total_stmt = (
        select(func.count(Alert.id)).join(Camera, Camera.id == Alert.camera_id).where(*conditions)
    )
    page_stmt = (
        _with_camera_and_acknowledger()
        .where(*conditions)
        .order_by(Alert.occurred_at.desc(), Alert.id.desc())
        .limit(query.page_size)
        .offset((query.page - 1) * query.page_size)
    )
    items = [to_alert(*row) for row in db.execute(page_stmt)]
    total = db.scalar(total_stmt) or 0
    return Page[AlertModel](items=items, total=total, page=query.page, page_size=query.page_size)


# ---- audit trail and snapshot ----------------------------------------------------------


def _require_alert(db: Session, alert_id: str) -> Alert:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise not_found("No alert with this ID.")
    return alert


def list_actions(db: Session, alert_id: str) -> list[AlertActionModel]:
    """Oldest first, so the timeline reads top to bottom."""
    _require_alert(db, alert_id)
    rows = db.execute(
        select(AlertAction, User)
        .join(User, User.id == AlertAction.user_id)
        .where(AlertAction.alert_id == alert_id)
        .order_by(AlertAction.at, AlertAction.id)
    )
    return [to_action(action, user) for action, user in rows]


def to_action(action: AlertAction, user: User) -> AlertActionModel:
    return AlertActionModel(
        id=action.id,
        alert_id=action.alert_id,
        action=action.action,
        from_status=action.from_status,
        to_status=action.to_status,
        user=UserRef(id=user.id, display_name=user.display_name),
        note=action.note,
        at=action.at,
    )


def snapshot_file(db: Session, storage: Storage, alert_id: str) -> Path:
    """The snapshot on disk, or a 404 when the alert or its file is missing."""
    alert = _require_alert(db, alert_id)
    try:
        path = storage.path_of(alert.snapshot_path)
    except ValueError:
        path = None
    if path is None or not path.is_file():
        raise not_found("This alert's snapshot is not available.")
    return path
