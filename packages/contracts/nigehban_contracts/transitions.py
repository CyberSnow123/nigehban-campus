"""Alert and run status tables (Data-Contracts.md §2 and §4). Enforced by the API service layer."""

from nigehban_contracts.enums import CLOSED_STATUSES, AlertStatus, EventType, RunStatus

_ANY_TYPE_OUTCOMES = frozenset({AlertStatus.RESOLVED, AlertStatus.FALSE_ALARM})
_THEFT_ONLY_OUTCOMES = frozenset({AlertStatus.AUTHORISED_PICKUP, AlertStatus.CONFIRMED_THEFT})


def allowed_outcomes(event_type: EventType) -> frozenset[AlertStatus]:
    """Closed statuses an operator may pick for this alert type."""
    if EventType(event_type) is EventType.POSSIBLE_THEFT:
        return _ANY_TYPE_OUTCOMES | _THEFT_ONLY_OUTCOMES
    return _ANY_TYPE_OUTCOMES


def _build_table() -> dict[tuple[EventType, AlertStatus], frozenset[AlertStatus]]:
    table: dict[tuple[EventType, AlertStatus], frozenset[AlertStatus]] = {}
    for event_type in EventType:
        outcomes = allowed_outcomes(event_type)
        table[(event_type, AlertStatus.ACTIVE)] = outcomes | {AlertStatus.ACKNOWLEDGED}
        table[(event_type, AlertStatus.ACKNOWLEDGED)] = outcomes
        for closed in CLOSED_STATUSES:
            table[(event_type, closed)] = frozenset()
    return table


ALLOWED_TRANSITIONS = _build_table()


def can_transition(event_type: EventType, from_status: AlertStatus, to_status: AlertStatus) -> bool:
    key = (EventType(event_type), AlertStatus(from_status))
    return AlertStatus(to_status) in ALLOWED_TRANSITIONS[key]


RUN_TRANSITIONS: dict[RunStatus, frozenset[RunStatus]] = {
    RunStatus.QUEUED: frozenset({RunStatus.RUNNING, RunStatus.STOPPED, RunStatus.FAILED}),
    RunStatus.RUNNING: frozenset(
        {RunStatus.RUNNING, RunStatus.COMPLETED, RunStatus.STOPPED, RunStatus.FAILED}
    ),
    RunStatus.COMPLETED: frozenset(),
    RunStatus.STOPPED: frozenset(),
    RunStatus.FAILED: frozenset(),
}
"""``running -> running`` is a heartbeat. Completed, stopped and failed are terminal."""


def can_update_run(from_status: RunStatus, to_status: RunStatus) -> bool:
    return RunStatus(to_status) in RUN_TRANSITIONS[RunStatus(from_status)]
