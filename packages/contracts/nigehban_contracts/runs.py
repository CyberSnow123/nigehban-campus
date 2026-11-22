"""Runs, cameras and worker telemetry (Data-Contracts.md §4 and §5)."""

import re

from pydantic import Field, StrictBool, field_validator

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


VIDEO_PATH_MAX = 255
_DRIVE = re.compile(r"^[A-Za-z]:")


def check_video_path(value: str) -> str:
    """A path relative to ``DATA_DIR/videos``: no ``..``, no root, no drive letter.

    Back-slashes become ``/``. Existence is not checked here (Data-Contracts.md §4).
    """
    path = value.strip().replace("\\", "/")
    if not path or len(path) > VIDEO_PATH_MAX:
        raise ValueError(f"video_path must be 1-{VIDEO_PATH_MAX} characters")
    if path.startswith("/") or _DRIVE.match(path):
        raise ValueError("video_path must be relative to DATA_DIR/videos")
    parts = path.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise ValueError("video_path must not contain empty, '.' or '..' parts")
    return path


class IngestRunCreate(ContractModel):
    """A standalone worker registers its own run. ``camera`` is the camera's unique name."""

    camera: str = Field(min_length=1, max_length=64)
    source: EventSource
    video_path: str

    @field_validator("video_path")
    @classmethod
    def _safe_video_path(cls, value: str) -> str:
        return check_video_path(value)


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
