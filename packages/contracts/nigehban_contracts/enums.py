"""Enumerations from Data-Contracts.md §2 and §6."""

from enum import StrEnum


class EventType(StrEnum):
    ABANDONED_BAG = "abandoned_bag"
    POSSIBLE_THEFT = "possible_theft"


class BagClass(StrEnum):
    HANDBAG = "handbag"
    BACKPACK = "backpack"


class EventSource(StrEnum):
    REAL = "real"
    MOCK = "mock"


class AlertStatus(StrEnum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"
    AUTHORISED_PICKUP = "authorised_pickup"
    CONFIRMED_THEFT = "confirmed_theft"


class ActionType(StrEnum):
    ACKNOWLEDGE = "acknowledge"
    CLOSE = "close"


class RunStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    STOPPED = "stopped"
    FAILED = "failed"


class UserRole(StrEnum):
    OPERATOR = "operator"
    ADMIN = "admin"


class ErrorCode(StrEnum):
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_TRANSITION = "INVALID_TRANSITION"
    DUPLICATE_EVENT = "DUPLICATE_EVENT"
    RUN_NOT_RUNNING = "RUN_NOT_RUNNING"
    INTERNAL_ERROR = "INTERNAL_ERROR"


OPEN_STATUSES = frozenset({AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED})
CLOSED_STATUSES = frozenset(set(AlertStatus) - OPEN_STATUSES)
WORKER_RUN_STATUSES = frozenset(
    {RunStatus.RUNNING, RunStatus.COMPLETED, RunStatus.STOPPED, RunStatus.FAILED}
)
