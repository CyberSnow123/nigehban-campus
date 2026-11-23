"""Alert read models and the close request (Data-Contracts.md §5 and §6)."""

from pydantic import Field, StrictBool, field_validator

from nigehban_contracts.base import ContractModel, NonNegFloat, NonNegInt, Unit, UtcDatetime
from nigehban_contracts.common import UserRef
from nigehban_contracts.enums import CLOSED_STATUSES, ActionType, AlertStatus, EventType
from nigehban_contracts.events import BagInfo
from nigehban_contracts.ids import ActionId, AlertId, CameraId, EventId, RefCode, RunId


class CameraRef(ContractModel):
    id: CameraId
    name: str
    location: str


class Alert(ContractModel):
    id: AlertId
    ref_code: RefCode
    type: EventType
    status: AlertStatus
    is_demo: StrictBool
    camera: CameraRef
    run_id: RunId
    event_id: EventId
    occurred_at: UtcDatetime
    video_ts_s: NonNegFloat
    bag: BagInfo
    owner_track_id: NonNegInt | None = None
    carrier_track_id: NonNegInt | None = None
    separation_s: NonNegFloat | None = None
    owner_distance_m: NonNegFloat | None = None
    owner_away_s: NonNegFloat | None = None
    confidence: Unit
    owner_match: Unit | None = None
    snapshot_url: str
    next_statuses: list[AlertStatus]
    acknowledged_by: UserRef | None = None
    acknowledged_at: UtcDatetime | None = None
    closed_at: UtcDatetime | None = None
    created_at: UtcDatetime


class AlertAction(ContractModel):
    id: ActionId
    alert_id: AlertId
    action: ActionType
    from_status: AlertStatus
    to_status: AlertStatus
    user: UserRef
    note: str | None = None
    at: UtcDatetime


class CloseRequest(ContractModel):
    outcome: AlertStatus
    note: str | None = Field(default=None, max_length=500)

    @field_validator("outcome")
    @classmethod
    def _closed_status_only(cls, value: AlertStatus) -> AlertStatus:
        if value not in CLOSED_STATUSES:
            raise ValueError("outcome must be a closed status")
        return value


class Stats(ContractModel):
    open_total: NonNegInt
    active: NonNegInt
    acknowledged: NonNegInt
    today_abandoned: NonNegInt
    today_theft: NonNegInt
    closed_today: NonNegInt
    running_runs: NonNegInt
