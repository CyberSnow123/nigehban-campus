"""Worker key, run registration, status posts and frame push (Data-Contracts §4)."""

import itertools

import pytest
from nigehban_contracts import RunStatus, can_update_run
from sqlalchemy.orm import Session

from app.models import Camera, Run
from tests.conftest import JPEG, event_payload

RUN_BODY = {"camera": "CAM 01", "source": "mock", "video_path": "office_01.mp4"}
STATUS = {"status": "running", "frames_processed": 10, "fps": 12.5, "message": None}


# ---- worker key ----------------------------------------------------------------------


def _routes(run_id: str):
    return [
        ("/api/ingest/runs", {"json": RUN_BODY}),
        (f"/api/ingest/runs/{run_id}/status", {"json": STATUS}),
        (f"/api/ingest/runs/{run_id}/frame", {"files": {"frame": ("f.jpg", JPEG)}}),
        ("/api/ingest/events", {"data": {"event": "{}"}, "files": {"snapshot": ("s.jpg", JPEG)}}),
    ]


@pytest.mark.parametrize("headers", [{}, {"X-Worker-Key": "wrong"}, {"X-Worker-Key": ""}])
def test_every_route_needs_the_worker_key(client, make_run, storage_dir, headers):
    run = make_run()
    for path, kwargs in _routes(run.id):
        res = client.post(path, headers=headers, **kwargs)
        assert res.status_code == 401, path
        assert res.json()["error"]["code"] == "UNAUTHORIZED"
        assert "WWW-Authenticate" not in res.headers  # not a Bearer token


def test_a_user_token_is_not_a_worker_key(client, operator, login, live_camera):
    res = client.post("/api/ingest/runs", json=RUN_BODY, headers=login("operator"))
    assert res.status_code == 401


# ---- register a run ------------------------------------------------------------------


@pytest.mark.parametrize(("source", "demo"), [("mock", True), ("real", False)])
def test_create_run(client, worker_headers, live_camera, source, demo):
    res = client.post(
        "/api/ingest/runs", json=RUN_BODY | {"source": source}, headers=worker_headers
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["id"].startswith("run_")
    assert body["camera_id"] == live_camera.id
    assert body["status"] == "running"
    assert body["is_demo"] is demo
    assert body["started_at"] is not None and body["ended_at"] is None
    assert body["video_path"] == "office_01.mp4"


def test_create_run_normalises_back_slashes(client, worker_headers, live_camera):
    body = RUN_BODY | {"video_path": "lab\\clip.mp4"}
    res = client.post("/api/ingest/runs", json=body, headers=worker_headers)
    assert res.json()["video_path"] == "lab/clip.mp4"


def test_create_run_unknown_camera(client, worker_headers, live_camera):
    res = client.post(
        "/api/ingest/runs", json=RUN_BODY | {"camera": "CAM 99"}, headers=worker_headers
    )
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


def test_create_run_inactive_camera(client, worker_headers, db: Session, live_camera: Camera):
    live_camera.is_active = False
    db.commit()
    res = client.post("/api/ingest/runs", json=RUN_BODY, headers=worker_headers)
    assert res.status_code == 422


@pytest.mark.parametrize("path", ["../x.mp4", "/abs.mp4", "C:\\x.mp4", ""])
def test_create_run_bad_video_path(client, worker_headers, live_camera, path):
    res = client.post(
        "/api/ingest/runs", json=RUN_BODY | {"video_path": path}, headers=worker_headers
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


# ---- status --------------------------------------------------------------------------


def _post_status(client, headers, run_id, **fields):
    return client.post(f"/api/ingest/runs/{run_id}/status", json=STATUS | fields, headers=headers)


@pytest.mark.parametrize(
    ("start", "target"),
    [
        (s, t)
        for s, t in itertools.product(RunStatus, RunStatus)
        if t is not RunStatus.QUEUED  # the contract rejects a posted "queued" (422)
    ],
)
def test_every_status_move(client, worker_headers, make_run, start, target):
    run = make_run(status=start.value)
    res = _post_status(client, worker_headers, run.id, status=target.value)
    if can_update_run(start, target):
        assert res.status_code == 200, res.text
        assert res.json()["status"] == target.value
    else:
        assert res.status_code == 409
        assert res.json()["error"]["code"] == "RUN_NOT_RUNNING"


def test_posting_queued_is_rejected(client, worker_headers, make_run):
    res = _post_status(client, worker_headers, make_run().id, status="queued")
    assert res.status_code == 422


def test_status_updates_counters_and_times(client, worker_headers, make_run, db: Session):
    run = make_run(status="queued")
    db.execute(Run.__table__.update().where(Run.id == run.id).values(started_at=None))
    db.commit()

    body = _post_status(client, worker_headers, run.id, frames_processed=50, fps=9.5).json()
    assert body["frames_processed"] == 50 and body["fps"] == 9.5
    assert body["started_at"] is not None and body["ended_at"] is None

    # fps omitted keeps the last value; message is overwritten
    body = _post_status(
        client, worker_headers, run.id, status="failed", fps=None, message="camera lost"
    ).json()
    assert body["fps"] == 9.5
    assert body["message"] == "camera lost"
    assert body["ended_at"] is not None and body["ended_at"] >= body["started_at"]


def test_status_unknown_run(client, worker_headers):
    res = _post_status(client, worker_headers, "run_01JD2W0000000000000000000A")
    assert res.status_code == 404


# ---- frame ---------------------------------------------------------------------------


def _post_frame(client, headers, run_id, data=JPEG):
    return client.post(
        f"/api/ingest/runs/{run_id}/frame", files={"frame": ("f.jpg", data)}, headers=headers
    )


def test_frame_is_saved_and_replaced(client, worker_headers, make_run, storage_dir):
    run = make_run()
    assert _post_frame(client, worker_headers, run.id).status_code == 204
    second = JPEG + b"tail"
    assert _post_frame(client, worker_headers, run.id, second).status_code == 204
    frames = list((storage_dir / "frames").iterdir())
    assert [f.name for f in frames] == [f"{run.id}.jpg"]  # no temp files left
    assert frames[0].read_bytes() == second


def test_frame_needs_a_running_run(client, worker_headers, make_run, storage_dir):
    run = make_run(status="completed")
    res = _post_frame(client, worker_headers, run.id)
    assert res.status_code == 409
    assert not (storage_dir / "frames").exists()


@pytest.mark.parametrize("data", [b"PNG not jpeg", b"", JPEG[:3] + b"x" * (2 * 1024 * 1024)])
def test_frame_must_be_a_small_jpeg(client, worker_headers, make_run, storage_dir, data):
    res = _post_frame(client, worker_headers, make_run().id, data)
    assert res.status_code == 422


def test_frame_unknown_run(client, worker_headers, storage_dir):
    assert _post_frame(client, worker_headers, "run_01JD2W0000000000000000000A").status_code == 404


def test_event_payload_helper_is_valid(make_run):
    from nigehban_contracts import DetectionEvent

    run = make_run()
    DetectionEvent.model_validate(event_payload(run))
    DetectionEvent.model_validate(event_payload(run, "possible_theft"))
