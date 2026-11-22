"""Parallel ingest: one alert per event_id, distinct ref codes (phase-06 decisions 8 and 9).

These call the service from several threads, each with its own DB session, like parallel
requests do.
"""

import io
import threading
from concurrent.futures import ThreadPoolExecutor

from nigehban_contracts import DetectionEvent
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.models import Alert
from app.services.ingest_service import ingest_event
from app.services.storage import Storage
from tests.conftest import JPEG, event_payload

WORKERS = 8


def _run_parallel(engine: Engine, storage: Storage, events: list[DetectionEvent]):
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    start = threading.Barrier(len(events))

    def one(event: DetectionEvent):
        with factory() as session:
            start.wait()  # all threads hit the lock at the same moment
            return ingest_event(session, storage, event, io.BytesIO(JPEG))

    with ThreadPoolExecutor(max_workers=len(events)) as pool:
        return list(pool.map(one, events))


def test_parallel_retries_make_one_alert_and_one_file(engine, db: Session, make_run, tmp_path):
    storage = Storage(tmp_path / "data")
    event = DetectionEvent.model_validate(event_payload(make_run()))
    results = _run_parallel(engine, storage, [event] * WORKERS)

    assert sum(not r.duplicate for r in results) == 1
    assert len({r.alert_id for r in results}) == 1
    assert len(list(db.scalars(select(Alert)))) == 1
    files = [p for p in (tmp_path / "data").rglob("*") if p.is_file()]
    assert [p.name for p in files] == [f"{event.event_id}.jpg"]


def test_parallel_events_get_distinct_consecutive_codes(engine, db: Session, make_run, tmp_path):
    run = make_run()
    events = [DetectionEvent.model_validate(event_payload(run)) for _ in range(WORKERS)]
    results = _run_parallel(engine, Storage(tmp_path / "data"), events)

    assert not any(r.duplicate for r in results)
    codes = sorted(db.scalars(select(Alert.ref_code)))
    assert codes == [f"SEC-2026-{n:03d}-A" for n in range(1, WORKERS + 1)]
