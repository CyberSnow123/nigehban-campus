"""GET /api/alerts (filters, paging), detail, snapshot and audit trail; one end-to-end flow."""

from datetime import UTC, datetime, timedelta

import pytest
from nigehban_contracts import Alert as AlertModel
from nigehban_contracts import AlertAction as AlertActionModel
from nigehban_contracts import Page
from sqlalchemy.orm import Session

from app.models import Alert, Camera
from tests.conftest import JPEG


@pytest.fixture
def auth(login, operator):
    return login("operator")


def _list(client, auth, **params):
    res = client.get("/api/alerts", params=params, headers=auth)
    assert res.status_code == 200, res.text
    return Page[AlertModel].model_validate(res.json())


def _ids(page) -> list[str]:
    return [a.id for a in page.items]


def _set(db: Session, alert: Alert, **values) -> None:
    for key, value in values.items():
        setattr(alert, key, value)
    db.commit()


# ---- list ------------------------------------------------------------------------------


def test_list_needs_a_user(client):
    assert client.get("/api/alerts").status_code == 401


def test_list_is_newest_first_and_valid(client, auth, db, make_ingested_alert):
    old = make_ingested_alert()
    new = make_ingested_alert("possible_theft")
    _set(db, old, occurred_at=datetime(2026, 11, 1, tzinfo=UTC))
    page = _list(client, auth)
    assert _ids(page) == [new.id, old.id]
    assert page.total == 2 and page.page == 1 and page.page_size == 20
    assert page.items[0].snapshot_url == f"/api/alerts/{new.id}/snapshot"
    assert page.items[0].camera.name == "CAM 01"


def test_status_filters(client, auth, make_ingested_alert):
    active = make_ingested_alert()
    acked = make_ingested_alert(status="acknowledged")
    resolved = make_ingested_alert(status="resolved")
    assert _ids(_list(client, auth, status="active")) == [active.id]
    assert set(_ids(_list(client, auth, status="open"))) == {active.id, acked.id}
    assert _ids(_list(client, auth, status="closed")) == [resolved.id]
    assert _ids(_list(client, auth, status="resolved")) == [resolved.id]


def test_type_run_camera_and_demo_filters(client, auth, make_run, make_ingested_alert):
    real_run = make_run(source="real")
    abandoned = make_ingested_alert()
    theft = make_ingested_alert("possible_theft", run=real_run)
    assert _ids(_list(client, auth, type="possible_theft")) == [theft.id]
    assert _ids(_list(client, auth, run_id=real_run.id)) == [theft.id]
    assert _ids(_list(client, auth, is_demo="true")) == [abandoned.id]
    assert _ids(_list(client, auth, is_demo="false")) == [theft.id]
    assert _list(client, auth, camera_id=abandoned.camera_id).total == 2
    assert _list(client, auth, camera_id="cam_01JD2V0000000000000000000A").total == 0


def test_person_matches_owner_or_carrier(client, auth, make_ingested_alert):
    owner = make_ingested_alert(owner_track_id=7)
    carrier = make_ingested_alert("possible_theft", owner_track_id=3, carrier_track_id=7)
    make_ingested_alert(owner_track_id=8)
    assert set(_ids(_list(client, auth, person=7))) == {owner.id, carrier.id}


def test_search(client, auth, db, live_camera: Camera, make_ingested_alert):
    first = make_ingested_alert(owner_track_id=31)
    second = make_ingested_alert(
        "possible_theft", bag={"track_id": 5, "class": "backpack", "bbox": [1, 2, 3, 4]}
    )
    assert _ids(_list(client, auth, q=first.ref_code.lower())) == [first.id]
    assert _list(client, auth, q="main libr").total == 2  # camera location
    assert _list(client, auth, q="cam 01").total == 2  # camera name
    assert _ids(_list(client, auth, q="31")) == [first.id]  # owner track
    assert _ids(_list(client, auth, q="#5")) == [second.id]  # bag track
    assert _list(client, auth, q="%").total == 0  # LIKE wildcards are literal
    assert _list(client, auth, q="   ").total == 2  # blank = no filter


def test_search_by_person_bag_and_type_words(client, auth, make_ingested_alert):
    # Abandoned: Handbag #18, owner Person #31. Possible theft: Backpack #5, owner 2, carrier 12.
    first = make_ingested_alert(owner_track_id=31)
    second = make_ingested_alert(
        "possible_theft", bag={"track_id": 5, "class": "backpack", "bbox": [1, 2, 3, 4]}
    )

    def found(q: str) -> list[str]:
        return _ids(_list(client, auth, q=q))

    assert found("person 31") == [first.id]
    assert found("Person #12") == [second.id]  # carrier
    assert found("P2") == [second.id]  # owner
    assert found("p-31") == [first.id]
    assert found("person 18") == []  # 18 is a bag, not a person
    assert found("Bag #18") == [first.id]
    assert found("bag 5") == [second.id]
    assert found("Handbag #18") == [first.id]
    assert found("backpack 18") == []  # bag 18 is a handbag
    assert found("bag 31") == []  # 31 is a person, not a bag
    assert found("theft") == [second.id]
    assert found("abandoned") == [first.id]


def test_time_range(client, auth, db, make_ingested_alert):
    alert = make_ingested_alert()
    when = datetime(2026, 11, 10, 12, tzinfo=UTC)
    _set(db, alert, occurred_at=when)
    hour = timedelta(hours=1)
    assert _list(client, auth, **{"from": (when - hour).isoformat()}).total == 1
    assert _list(client, auth, **{"from": (when + hour).isoformat()}).total == 0
    assert _list(client, auth, to=(when - hour).isoformat()).total == 0


def test_paging(client, auth, make_run, make_ingested_alert):
    run = make_run()
    created = [make_ingested_alert(run=run).id for _ in range(5)]
    first = _list(client, auth, page_size=2)
    third = _list(client, auth, page_size=2, page=3)
    assert first.total == 5 and len(first.items) == 2
    assert len(third.items) == 1
    beyond = _list(client, auth, page_size=2, page=9)
    assert beyond.items == [] and beyond.total == 5
    every = _ids(_list(client, auth, page_size=100))
    assert sorted(every) == sorted(created)


@pytest.mark.parametrize(
    "params",
    [
        {"status": "lost"},
        {"type": "theft"},
        {"page": 0},
        {"page_size": 101},
        {"person": -1},
        {"person": "abc"},
        {"run_id": "alt_01JD2Y0000000000000000000A"},
        {"from": "yesterday"},
        {"from": "2026-11-10T12:00:00"},  # no timezone
        {"q": "x" * 101},
    ],
)
def test_bad_filters_are_422(client, auth, params):
    res = client.get("/api/alerts", params=params, headers=auth)
    assert res.status_code == 422, params
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_unknown_query_keys_are_ignored(client, auth):
    assert client.get("/api/alerts?t=123", headers=auth).status_code == 200


# ---- detail, snapshot, actions ---------------------------------------------------------


def test_detail_matches_the_contract(client, auth, make_ingested_alert):
    alert = make_ingested_alert("possible_theft")
    res = client.get(f"/api/alerts/{alert.id}", headers=auth)
    body = AlertModel.model_validate(res.json())
    assert body.ref_code == alert.ref_code
    assert body.bag.class_.value == "handbag"
    assert body.owner_match == 0.18 and body.carrier_track_id == 12
    assert [s.value for s in body.next_statuses] == [
        "acknowledged",
        "resolved",
        "false_alarm",
        "authorised_pickup",
        "confirmed_theft",
    ]
    assert "snapshot_path" not in res.json()  # file paths never reach the client


@pytest.mark.parametrize(
    ("event_type", "status", "expected"),
    [
        ("abandoned_bag", "active", ["acknowledged", "resolved", "false_alarm"]),
        ("abandoned_bag", "acknowledged", ["resolved", "false_alarm"]),
        ("abandoned_bag", "false_alarm", []),
        ("possible_theft", "confirmed_theft", []),
    ],
)
def test_next_statuses_follow_type_and_status(
    client, auth, make_ingested_alert, event_type, status, expected
):
    alert = make_ingested_alert(event_type, status)
    assert client.get(f"/api/alerts/{alert.id}", headers=auth).json()["next_statuses"] == expected


@pytest.mark.parametrize("suffix", ["", "/snapshot", "/actions"])
def test_unknown_alert_is_404(client, auth, suffix):
    for alert_id in ["alt_01JD2Y0000000000000000000A", "not-an-id"]:
        res = client.get(f"/api/alerts/{alert_id}{suffix}", headers=auth)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "NOT_FOUND"


def test_snapshot_bytes_and_cache_header(client, auth, make_ingested_alert):
    alert = make_ingested_alert()
    res = client.get(f"/api/alerts/{alert.id}/snapshot", headers=auth)
    assert res.status_code == 200
    assert res.content == JPEG
    assert res.headers["content-type"] == "image/jpeg"
    assert res.headers["cache-control"] == "private, max-age=3600"


def test_snapshot_needs_a_user(client, make_ingested_alert):
    alert = make_ingested_alert()
    assert client.get(f"/api/alerts/{alert.id}/snapshot").status_code == 401


def test_missing_snapshot_file_is_404(client, auth, storage_dir, make_ingested_alert):
    alert = make_ingested_alert()
    (storage_dir / alert.snapshot_path).unlink()
    res = client.get(f"/api/alerts/{alert.id}/snapshot", headers=auth)
    assert res.status_code == 404
    assert "snapshots" not in res.text  # no path in the message


def test_snapshot_path_outside_data_dir_is_404(client, auth, db, make_ingested_alert):
    alert = make_ingested_alert()
    _set(db, alert, snapshot_path="../../outside.jpg")
    assert client.get(f"/api/alerts/{alert.id}/snapshot", headers=auth).status_code == 404


def test_end_to_end_ingest_to_timeline(client, auth, operator, post_event, make_run):
    """Roadmap Phase 7 check: ingest, list, acknowledge, close as false alarm, timeline."""
    from tests.conftest import event_payload

    alert_id = post_event(event_payload(make_run())).json()["alert_id"]
    assert _ids(_list(client, auth, status="active")) == [alert_id]

    client.post(f"/api/alerts/{alert_id}/acknowledge", headers=auth)
    closed = client.post(
        f"/api/alerts/{alert_id}/close",
        json={"outcome": "false_alarm", "note": "Owner came back"},
        headers=auth,
    ).json()
    assert closed["status"] == "false_alarm"

    res = client.get(f"/api/alerts/{alert_id}/actions", headers=auth)
    timeline = [AlertActionModel.model_validate(a) for a in res.json()]
    assert [(a.action.value, a.from_status.value, a.to_status.value) for a in timeline] == [
        ("acknowledge", "active", "acknowledged"),
        ("close", "acknowledged", "false_alarm"),
    ]
    assert timeline[1].note == "Owner came back"
    assert timeline[0].user.display_name == operator.display_name
    assert _ids(_list(client, auth, status="open")) == []
