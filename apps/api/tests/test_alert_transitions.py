"""Acknowledge and close through the API: every cell of the transition table, plus audit rows."""

import itertools
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from nigehban_contracts import CLOSED_STATUSES, AlertStatus, EventType, can_transition
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.core.errors import ApiError
from app.models import Alert, AlertAction, User
from app.services import alert_service

# Targets the API can be asked for: acknowledged (acknowledge) and the closed statuses (close).
TARGETS = [AlertStatus.ACKNOWLEDGED, *sorted(CLOSED_STATUSES)]
CELLS = list(itertools.product(EventType, AlertStatus, TARGETS))


def act(client, headers, alert_id: str, target: AlertStatus, note: str | None = None):
    if target is AlertStatus.ACKNOWLEDGED:
        return client.post(f"/api/alerts/{alert_id}/acknowledge", headers=headers)
    body = {"outcome": target.value, "note": note}
    return client.post(f"/api/alerts/{alert_id}/close", json=body, headers=headers)


def _actions(db: Session, alert_id: str) -> list[AlertAction]:
    db.expire_all()
    return list(db.scalars(select(AlertAction).where(AlertAction.alert_id == alert_id)))


def _theft_only_status_on_abandoned(event_type: EventType, status: AlertStatus) -> bool:
    """The DB forbids an abandoned alert in a theft-only status, so those cells cannot exist."""
    theft_only = {AlertStatus.AUTHORISED_PICKUP, AlertStatus.CONFIRMED_THEFT}
    return event_type is EventType.ABANDONED_BAG and status in theft_only


@pytest.mark.parametrize(("event_type", "start", "target"), CELLS)
def test_every_transition_cell(client, login, db, make_ingested_alert, event_type, start, target):
    if _theft_only_status_on_abandoned(event_type, start):
        pytest.skip("not a reachable state")
    alert = make_ingested_alert(event_type.value, start.value)
    headers = login("operator")

    res = act(client, headers, alert.id, target, note="checked on camera")
    actions = _actions(db, alert.id)

    if can_transition(event_type, start, target):
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["status"] == target.value
        [row] = actions
        assert (row.from_status, row.to_status) == (start.value, target.value)
        assert row.action == ("acknowledge" if target is AlertStatus.ACKNOWLEDGED else "close")
        assert row.note == (None if target is AlertStatus.ACKNOWLEDGED else "checked on camera")
    else:
        assert res.status_code == 409, res.text
        assert res.json()["error"]["code"] == "INVALID_TRANSITION"
        assert actions == []
        db.expire_all()
        assert db.get(Alert, alert.id).status == start.value


def test_acknowledge_sets_who_and_when(client, login, operator: User, make_ingested_alert):
    alert = make_ingested_alert()
    body = client.post(f"/api/alerts/{alert.id}/acknowledge", headers=login("operator")).json()
    assert body["acknowledged_by"] == {"id": operator.id, "display_name": operator.display_name}
    assert body["acknowledged_at"] is not None
    assert body["closed_at"] is None
    assert body["next_statuses"] == ["resolved", "false_alarm"]


def test_close_from_active_skips_acknowledge(client, login, make_ingested_alert):
    alert = make_ingested_alert("possible_theft")
    res = act(client, login("operator"), alert.id, AlertStatus.CONFIRMED_THEFT)
    body = res.json()
    assert body["status"] == "confirmed_theft"
    assert body["closed_at"] is not None
    assert body["acknowledged_by"] is None
    assert body["next_statuses"] == []


def test_repeat_acknowledge_message(client, login, make_ingested_alert):
    alert = make_ingested_alert(status="acknowledged")
    res = act(client, login("operator"), alert.id, AlertStatus.ACKNOWLEDGED)
    assert res.json()["error"]["message"] == "This alert is already acknowledged."


@pytest.mark.parametrize(
    "body",
    [
        {"outcome": "active"},
        {"outcome": "acknowledged"},
        {"outcome": "stolen"},
        {"outcome": "resolved", "note": "x" * 501},
        {"outcome": "resolved", "extra": 1},
        {},
    ],
)
def test_bad_close_body_is_422(client, login, db, make_ingested_alert, body):
    alert = make_ingested_alert()
    res = client.post(f"/api/alerts/{alert.id}/close", json=body, headers=login("operator"))
    assert res.status_code == 422
    assert _actions(db, alert.id) == []


def test_empty_note_is_stored_as_none(client, login, db, make_ingested_alert):
    alert = make_ingested_alert()
    act(client, login("operator"), alert.id, AlertStatus.RESOLVED, note="")
    assert _actions(db, alert.id)[0].note is None


@pytest.mark.parametrize("path", ["acknowledge", "close"])
def test_unknown_alert_is_404(client, login, path, operator):
    res = client.post(
        f"/api/alerts/alt_01JD2Y0000000000000000000A/{path}",
        json={"outcome": "resolved"},
        headers=login("operator"),
    )
    assert res.status_code == 404


@pytest.mark.parametrize("path", ["acknowledge", "close"])
def test_actions_need_a_user(client, make_ingested_alert, path, worker_headers):
    alert = make_ingested_alert()
    res = client.post(
        f"/api/alerts/{alert.id}/{path}", json={"outcome": "resolved"}, headers=worker_headers
    )
    assert res.status_code == 401


def test_parallel_acknowledge_one_wins(engine, db, operator, make_ingested_alert):
    alert = make_ingested_alert()
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    start = threading.Barrier(2)

    def one(_):
        with factory() as session:
            start.wait()
            try:
                alert_service.acknowledge(session, alert.id, operator)
                return "ok"
            except ApiError as exc:
                return exc.code.value

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = sorted(pool.map(one, range(2)))
    assert results == ["INVALID_TRANSITION", "ok"]
    assert len(_actions(db, alert.id)) == 1
