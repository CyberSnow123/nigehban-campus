"""Shared Pydantic contracts for Nigehban Campus. Source of truth: docs/Data-Contracts.md."""

from nigehban_contracts.alerts import Alert, AlertAction, CameraRef, CloseRequest, Stats
from nigehban_contracts.common import ErrorBody, ErrorDetail, Page, UserMe, UserRef
from nigehban_contracts.config import (
    AbandonConfig,
    ApiConfig,
    AssociationConfig,
    CvConfig,
    DetectorConfig,
    OutputConfig,
    TheftConfig,
    TrackerConfig,
)
from nigehban_contracts.enums import (
    CLOSED_STATUSES,
    OPEN_STATUSES,
    WORKER_RUN_STATUSES,
    ActionType,
    AlertStatus,
    BagClass,
    ErrorCode,
    EventSource,
    EventType,
    RunStatus,
    UserRole,
)
from nigehban_contracts.events import BagInfo, BBox, DetectionEvent, IngestEventResponse
from nigehban_contracts.ids import IdPrefix, format_ref_code, is_valid_id, new_id, validate_id
from nigehban_contracts.runs import Camera, IngestRunCreate, Run, RunStatusUpdate, check_video_path
from nigehban_contracts.transitions import (
    ALLOWED_TRANSITIONS,
    RUN_TRANSITIONS,
    allowed_outcomes,
    can_transition,
    can_update_run,
    next_statuses,
)

__version__ = "0.1.0"

__all__ = [
    "ALLOWED_TRANSITIONS",
    "CLOSED_STATUSES",
    "OPEN_STATUSES",
    "RUN_TRANSITIONS",
    "WORKER_RUN_STATUSES",
    "AbandonConfig",
    "ActionType",
    "Alert",
    "AlertAction",
    "AlertStatus",
    "ApiConfig",
    "AssociationConfig",
    "BBox",
    "BagClass",
    "BagInfo",
    "Camera",
    "CameraRef",
    "CloseRequest",
    "CvConfig",
    "DetectionEvent",
    "DetectorConfig",
    "ErrorBody",
    "ErrorCode",
    "ErrorDetail",
    "EventSource",
    "EventType",
    "IdPrefix",
    "IngestEventResponse",
    "IngestRunCreate",
    "OutputConfig",
    "Page",
    "Run",
    "RunStatus",
    "RunStatusUpdate",
    "Stats",
    "TheftConfig",
    "TrackerConfig",
    "UserMe",
    "UserRef",
    "UserRole",
    "allowed_outcomes",
    "can_transition",
    "can_update_run",
    "check_video_path",
    "format_ref_code",
    "is_valid_id",
    "new_id",
    "next_statuses",
    "validate_id",
]
