"""GET /api/stats and GET /api/stats/history (Data-Contracts §5), plus the service's day edges."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from nigehban_contracts import HistoryStats, Stats
from sqlalchemy.orm import Session

from app.models import Alert
from app.services import stats_service
from tests.conftest import event_payload

KARACHI = ZoneInfo("Asia/Karachi")  # UTC+5, no DST
# 10:00 in Karachi on 23 Nov 2026.
NOW = datetime(2026, 11, 23, 5, 0, tzinfo=UTC)


@pytest.fixture
def auth(login, operator):
    return login("operator")


def _set(db: Session, alert: Alert, **values) -> None:
    for key, value in values.items():
        setattr(alert, key, value)
    db.commit()


def _stats(client, auth) -> Stats:
    res = client.get("/api/stats", headers=auth)
    assert res.status_code == 200, res.text
    return Stats.model_validate(res.json())


def _history(client, auth, **params) -> HistoryStats:
    res = client.get("/api/stats/history", params=params, headers=auth)
    assert res.status_code == 200, res.text
    return HistoryStats.model_validate(res.json())


# ---- /api/stats ------------------------------------------------------------------------


def test_stats_need_a_user(client):
    assert client.get("/api/stats").status_code == 401
    assert client.get("/api/stats/history").status_code == 401


def test_empty_database(client, auth):
    stats = _stats(client, auth)
    assert stats.model_dump() == {
        "open_total": 0,
        "active": 0,
        "acknowledged": 0,
        "today_abandoned": 0,
        "today_theft": 0,
        "closed_today": 0,
        "running_runs": 0,
        "latest_alert": None,
    }


def test_open_counts_by_status(client, auth, make_ingested_alert):
    make_ingested_alert()
    make_ingested_alert("possible_theft")
    make_ingested_alert(status="acknowledged")
    make_ingested_alert(status="resolved")
    make_ingested_alert("possible_theft", status="confirmed_theft")
    stats = _stats(client, auth)
    assert (stats.open_total, stats.active, stats.acknowledged) == (3, 2, 1)


def test_running_runs(client, auth, make_run):
    make_run(status="running")
    make_run(status="running")
    make_run(status="completed")
    assert _stats(client, auth).running_runs == 2


def test_latest_alert_is_the_last_one_stored(client, auth, db, make_ingested_alert):
    first = make_ingested_alert()
    last = make_ingested_alert("possible_theft")
    # Recorded footage: the newest alert can carry an older event time. It is still the latest.
    _set(db, last, occurred_at=first.occurred_at - timedelta(days=2))
    _set(db, first, created_at=last.created_at - timedelta(minutes=5))
    latest = _stats(client, auth).latest_alert
    assert latest is not None
    assert latest.id == last.id
    assert latest.ref_code == last.ref_code
    assert latest.type == "possible_theft"
    assert latest.camera_name == "CAM 01"


def test_new_event_moves_latest_and_active(client, auth, make_run, post_event):
    before = _stats(client, auth)
    res = post_event(event_payload(make_run(), "possible_theft"))
    assert res.status_code == 201
    after = _stats(client, auth)
    assert after.active == before.active + 1
    assert after.latest_alert is not None and after.latest_alert.id == res.json()["alert_id"]


# ---- today, in the campus timezone (service level, fixed clock) --------------------------


def test_today_bounds_use_local_midnight():
    start, end = stats_service.today_bounds(NOW, KARACHI)
    assert start.astimezone(UTC) == datetime(2026, 11, 22, 19, 0, tzinfo=UTC)
    assert end - start == timedelta(days=1)


def test_today_edges_across_local_midnight(db, make_ingested_alert):
    yesterday = make_ingested_alert()
    today = make_ingested_alert()
    theft = make_ingested_alert("possible_theft")
    tomorrow = make_ingested_alert("possible_theft")
    _set(db, yesterday, occurred_at=datetime(2026, 11, 22, 18, 59, tzinfo=UTC))  # 23:59 local
    _set(db, today, occurred_at=datetime(2026, 11, 22, 19, 1, tzinfo=UTC))  # 00:01 local
    _set(db, theft, occurred_at=NOW)
    _set(db, tomorrow, occurred_at=datetime(2026, 11, 23, 19, 0, tzinfo=UTC))  # next midnight
    stats = stats_service.dashboard_stats(db, NOW, KARACHI)
    assert (stats.today_abandoned, stats.today_theft) == (1, 1)


def test_closed_today_counts_by_closed_at(db, make_ingested_alert):
    closed_today = make_ingested_alert(status="resolved")
    closed_before = make_ingested_alert(status="false_alarm")
    _set(db, closed_today, closed_at=NOW, occurred_at=NOW - timedelta(days=3))
    _set(db, closed_before, closed_at=datetime(2026, 11, 22, 18, 59, tzinfo=UTC))
    assert stats_service.dashboard_stats(db, NOW, KARACHI).closed_today == 1


# ---- /api/stats/history ----------------------------------------------------------------


def _closed(make_ingested_alert, db, *, kind="abandoned_bag", status="resolved", **values):
    alert = make_ingested_alert(kind, status=status)
    _set(db, alert, **values)
    return alert


def test_history_counts_closed_alerts_only(client, auth, db, make_ingested_alert):
    make_ingested_alert()  # open: never counted
    make_ingested_alert(status="acknowledged")
    make_ingested_alert(status="resolved")
    make_ingested_alert(status="false_alarm")
    make_ingested_alert("possible_theft", status="false_alarm")
    now = datetime.now(UTC)
    for alert in db.query(Alert).all():
        _set(db, alert, occurred_at=now - timedelta(hours=1))
    history = _history(client, auth)
    assert (history.total, history.false_alarms) == (3, 2)
    assert _history(client, auth, type="possible_theft").total == 1


@pytest.mark.parametrize(("days", "expected"), [(1, 1), (7, 2), (30, 3)])
def test_history_ranges(client, auth, db, make_ingested_alert, days, expected):
    now = datetime.now(UTC)
    for age in (timedelta(hours=2), timedelta(days=3), timedelta(days=20), timedelta(days=40)):
        _closed(make_ingested_alert, db, occurred_at=now - age)
    assert _history(client, auth, days=days).total == expected


def test_average_response_uses_the_first_action(db, make_ingested_alert):
    raised = NOW - timedelta(hours=1)
    # Acknowledged after 60 s, closed much later: the response is 60 s.
    _closed(
        make_ingested_alert,
        db,
        occurred_at=raised,
        created_at=raised,
        acknowledged_at=raised + timedelta(seconds=60),
        closed_at=raised + timedelta(hours=1),
    )
    # Closed straight from active after 200 s.
    _closed(
        make_ingested_alert,
        db,
        status="false_alarm",
        occurred_at=raised,
        created_at=raised,
        acknowledged_at=None,
        acknowledged_by=None,
        closed_at=raised + timedelta(seconds=200),
    )
    assert stats_service.history_stats(db, NOW, 7).avg_response_s == 130.0


def test_average_is_null_when_nothing_is_in_range(client, auth, make_ingested_alert):
    make_ingested_alert()  # open only
    history = _history(client, auth)
    assert history.model_dump() == {"total": 0, "false_alarms": 0, "avg_response_s": None}


@pytest.mark.parametrize("params", [{"days": 3}, {"days": "x"}, {"type": "theft"}])
def test_history_bad_values_are_422(client, auth, params):
    assert client.get("/api/stats/history", params=params, headers=auth).status_code == 422
