import itertools

import pytest
from nigehban_contracts import (
    ALLOWED_TRANSITIONS,
    CLOSED_STATUSES,
    OPEN_STATUSES,
    AlertStatus,
    ErrorCode,
    EventType,
    RunStatus,
    allowed_outcomes,
    can_transition,
)

ANY_OUTCOMES = {AlertStatus.RESOLVED, AlertStatus.FALSE_ALARM}
THEFT_ONLY = {AlertStatus.AUTHORISED_PICKUP, AlertStatus.CONFIRMED_THEFT}


def expected_targets(event_type, from_status):
    """The transition table written out by hand from Data-Contracts.md §2."""
    if from_status not in OPEN_STATUSES:
        return set()
    targets = set(ANY_OUTCOMES)
    if event_type is EventType.POSSIBLE_THEFT:
        targets |= THEFT_ONLY
    if from_status is AlertStatus.ACTIVE:
        targets.add(AlertStatus.ACKNOWLEDGED)
    return targets


def test_enum_values_match_contract():
    assert {s.value for s in AlertStatus} == {
        "active",
        "acknowledged",
        "resolved",
        "false_alarm",
        "authorised_pickup",
        "confirmed_theft",
    }
    assert {s.value for s in RunStatus} == {"queued", "running", "completed", "stopped", "failed"}
    assert len(ErrorCode) == 9
    assert ErrorCode.RATE_LIMITED.value == "RATE_LIMITED"


def test_open_and_closed_partition_all_statuses():
    assert OPEN_STATUSES == {AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED}
    assert OPEN_STATUSES | CLOSED_STATUSES == set(AlertStatus)
    assert not OPEN_STATUSES & CLOSED_STATUSES


@pytest.mark.parametrize(
    ("event_type", "from_status", "to_status"),
    list(itertools.product(EventType, AlertStatus, AlertStatus)),
)
def test_every_transition_cell(event_type, from_status, to_status):
    expected = to_status in expected_targets(event_type, from_status)
    assert can_transition(event_type, from_status, to_status) is expected


def test_table_covers_every_type_and_status():
    assert set(ALLOWED_TRANSITIONS) == set(itertools.product(EventType, AlertStatus))


def test_closed_alerts_have_no_transitions():
    for event_type, status in itertools.product(EventType, CLOSED_STATUSES):
        assert ALLOWED_TRANSITIONS[(event_type, status)] == frozenset()


def test_allowed_outcomes_by_type():
    assert allowed_outcomes(EventType.ABANDONED_BAG) == ANY_OUTCOMES
    assert allowed_outcomes(EventType.POSSIBLE_THEFT) == ANY_OUTCOMES | THEFT_ONLY


def test_can_transition_accepts_plain_strings():
    assert can_transition("possible_theft", "active", "confirmed_theft")
    assert not can_transition("abandoned_bag", "active", "confirmed_theft")
