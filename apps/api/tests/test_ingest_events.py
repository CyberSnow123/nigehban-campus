"""``POST /api/ingest/events``: event + snapshot -> alert, idempotent (Data-Contracts §3, §4)."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Alert
from tests.conftest import JPEG, event_payload


def _alerts(db: Session) -> list[Alert]:
    db.expire_all()
    return list(db.scalars(select(Alert)))


def _files(root) -> list[str]:
    return sorted(p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file())


@pytest.mark.parametrize(
    ("event_type", "source", "suffix", "demo"),
    [
        ("abandoned_bag", "mock", "A", True),
        ("possible_theft", "real", "T", False),
    ],
)
def test_valid_event_creates_an_active_alert(
    post_event, make_run, storage_dir, db, event_type, source, suffix, demo
):
    run = make_run(source=source)
    payload = event_payload(run, event_type)
    res = post_event(payload)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["duplicate"] is False and body["alert_id"].startswith("alt_")

    [alert] = _alerts(db)
    assert alert.id == body["alert_id"]
    assert alert.status == "active"
    assert alert.is_demo is demo
    assert alert.ref_code == f"SEC-2026-001-{suffix}"
    assert alert.bag_bbox == [812, 440, 905, 560]
    assert alert.snapshot_path == f"snapshots/{run.id}/{payload['event_id']}.jpg"
    assert (storage_dir / alert.snapshot_path).read_bytes() == JPEG


def test_resend_is_a_duplicate(post_event, make_run, storage_dir, db):
    payload = event_payload(make_run())
    first = post_event(payload).json()
    again = post_event(payload)
    assert again.status_code == 200
    assert again.json() == {"alert_id": first["alert_id"], "duplicate": True}
    assert len(_alerts(db)) == 1
    assert len(_files(storage_dir)) == 1


def test_resend_after_the_run_ended_is_still_a_duplicate(
    client, worker_headers, post_event, make_run, storage_dir
):
    run = make_run()
    payload = event_payload(run)
    first = post_event(payload).json()
    client.post(
        f"/api/ingest/runs/{run.id}/status",
        json={"status": "completed", "frames_processed": 1},
        headers=worker_headers,
    )
    again = post_event(payload, snapshot=None)  # even without a snapshot
    assert again.status_code == 422  # the multipart field itself is still required

    again = post_event(payload)
    assert again.status_code == 200
    assert again.json()["alert_id"] == first["alert_id"]


def test_sequence_counts_across_types(post_event, make_run, storage_dir, db):
    run = make_run()
    post_event(event_payload(run))
    post_event(event_payload(run, "possible_theft"))
    codes = sorted(a.ref_code for a in _alerts(db))
    assert codes == ["SEC-2026-001-A", "SEC-2026-002-T"]


def test_unknown_run(post_event, make_run, storage_dir):
    payload = event_payload(make_run(), run_id="run_01JD2W0000000000000000000A")
    res = post_event(payload)
    assert res.status_code == 404


@pytest.mark.parametrize("status", ["queued", "completed", "stopped", "failed"])
def test_run_not_running(post_event, make_run, storage_dir, db, status):
    res = post_event(event_payload(make_run(status=status)))
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "RUN_NOT_RUNNING"
    assert _alerts(db) == [] and _files(storage_dir) == []


def test_camera_must_match_the_run(post_event, make_run, storage_dir):
    payload = event_payload(make_run(), camera_id="cam_01JD2V0000000000000000000A")
    res = post_event(payload)
    assert res.status_code == 422
    assert "camera_id" in res.json()["error"]["message"]


def test_a_mock_run_cannot_send_a_real_event(post_event, make_run, storage_dir, db):
    res = post_event(event_payload(make_run(source="mock"), source="real"))
    assert res.status_code == 422
    assert "source" in res.json()["error"]["message"]
    assert _alerts(db) == []


def test_theft_field_on_an_abandoned_event(post_event, make_run, storage_dir):
    payload = event_payload(make_run(), carrier_track_id=777123)
    res = post_event(payload)
    assert res.status_code == 422
    message = res.json()["error"]["message"]
    assert message.startswith("event")
    assert "carrier_track_id" in message
    assert "777123" not in message  # the input is never echoed


@pytest.mark.parametrize("raw", ["not json", "[]", '{"event_id": "evt_x"}'])
def test_bad_event_json(client, worker_headers, storage_dir, raw):
    res = client.post(
        "/api/ingest/events",
        data={"event": raw},
        files={"snapshot": ("s.jpg", JPEG)},
        headers=worker_headers,
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize(
    "snapshot", [b"GIF89a....", b"", JPEG[:3] + b"x" * (2 * 1024 * 1024), None]
)
def test_snapshot_must_be_a_small_jpeg(post_event, make_run, storage_dir, db, snapshot):
    res = post_event(event_payload(make_run()), snapshot=snapshot)
    assert res.status_code == 422
    assert _alerts(db) == [] and _files(storage_dir) == []


def test_snapshot_of_exactly_2_mb_is_accepted(post_event, make_run, storage_dir):
    data = JPEG[:3] + b"x" * (2 * 1024 * 1024 - 3)
    assert post_event(event_payload(make_run()), snapshot=data).status_code == 201


def test_db_failure_leaves_no_snapshot(post_event, make_run, storage_dir, db, monkeypatch):
    def broken(*args, **kwargs):
        raise RuntimeError("database went away")

    monkeypatch.setattr("app.services.alert_service.alert_from_event", broken)
    res = post_event(event_payload(make_run()))
    assert res.status_code == 500
    assert "database went away" not in res.text
    assert _alerts(db) == []
    assert _files(storage_dir) == []


def test_alert_row_counts_one_per_event(post_event, make_run, storage_dir, db):
    run = make_run()
    for _ in range(3):
        post_event(event_payload(run))
    assert db.scalar(select(func.count()).select_from(Alert)) == 3
