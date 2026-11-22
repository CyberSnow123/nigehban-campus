"""Runs, cameras and worker telemetry (Data-Contracts.md §4 and §5)."""

from pydantic import StrictBool, field_validator

from nigehban_contracts.base import ContractModel, NonNegFloat, NonNegInt, UtcDatetime
from nigehban_contracts.enums import WORKER_RUN_STATUSES, EventSource, RunStatus
from nigehban_contracts.ids import CameraId, RunId


class RunStatusUpdate(ContractModel):
    """Heartbeat a worker posts. ``queued`` is API-only, so it is rejected here."""

    status: RunStatus
    frames_processed: NonNegInt
    fps: NonNegFloat | None = None
    message: str | None = None

    @field_validator("status")
    @classmethod
    def _worker_status_only(cls, value: RunStatus) -> RunStatus:
        if value not in WORKER_RUN_STATUSES:
            raise ValueError("a worker may post running, completed, stopped or failed only")
        return value


class Run(ContractModel):
    id: RunId
    camera_id: CameraId
    source: EventSource
    video_path: str
    status: RunStatus
    is_demo: StrictBool
    frames_processed: NonNegInt
    fps: NonNegFloat | None = None
    started_at: UtcDatetime | None = None
    ended_at: UtcDatetime | None = None
    message: str | None = None


class Camera(ContractModel):
    id: CameraId
    name: str
    location: str
    is_active: StrictBool
