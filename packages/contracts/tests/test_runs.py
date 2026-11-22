"""IngestRunCreate and the run status table (Data-Contracts.md §4)."""

import itertools

import pytest
from nigehban_contracts import (
    RUN_TRANSITIONS,
    EventSource,
    IngestRunCreate,
    RunStatus,
    can_update_run,
)
from pydantic import ValidationError

TERMINAL = {RunStatus.COMPLETED, RunStatus.STOPPED, RunStatus.FAILED}


def expected_run_targets(from_status: RunStatus) -> set[RunStatus]:
    """The table written out by hand from Data-Contracts.md §4."""
    if from_status is RunStatus.QUEUED:
        return {RunStatus.RUNNING, RunStatus.STOPPED, RunStatus.FAILED}
    if from_status is RunStatus.RUNNING:
        return {RunStatus.RUNNING} | TERMINAL
    return set()


def test_ingest_run_example_parses(example):
    body = IngestRunCreate.model_validate(example("ingest_run"))
    assert body.camera == "CAM 01"
    assert body.source is EventSource.MOCK
    assert body.video_path == "office_01.mp4"


@pytest.mark.parametrize(
    ("raw", "stored"),
    [
        ("office_01.mp4", "office_01.mp4"),
        ("lab/cam1/clip.mp4", "lab/cam1/clip.mp4"),
        (r"lab\cam1\clip.mp4", "lab/cam1/clip.mp4"),
        ("  clip.mp4 ", "clip.mp4"),
        ("..clip.mp4", "..clip.mp4"),  # a dotted name is fine, a ".." part is not
    ],
)
def test_video_path_accepted(example, raw, stored):
    payload = example("ingest_run") | {"video_path": raw}
    assert IngestRunCreate.model_validate(payload).video_path == stored


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "   ",
        "../secret.mp4",
        "lab/../../x.mp4",
        "./clip.mp4",
        "lab//clip.mp4",
        "lab/",
        "/etc/passwd",
        r"\\server\share\x.mp4",
        r"C:\videos\x.mp4",
        r"\clip.mp4",
        "c:x.mp4",
        "a" * 256,
    ],
)
def test_video_path_rejected(example, raw):
    payload = example("ingest_run") | {"video_path": raw}
    with pytest.raises(ValidationError):
        IngestRunCreate.model_validate(payload)


@pytest.mark.parametrize("camera", ["", "x" * 65])
def test_camera_name_length(example, camera):
    with pytest.raises(ValidationError):
        IngestRunCreate.model_validate(example("ingest_run") | {"camera": camera})


def test_ingest_run_rejects_unknown_keys_and_bad_source(example):
    with pytest.raises(ValidationError):
        IngestRunCreate.model_validate(example("ingest_run") | {"run_id": "x"})
    with pytest.raises(ValidationError):
        IngestRunCreate.model_validate(example("ingest_run") | {"source": "fake"})


@pytest.mark.parametrize(
    ("from_status", "to_status"), list(itertools.product(RunStatus, RunStatus))
)
def test_every_run_transition_cell(from_status, to_status):
    expected = to_status in expected_run_targets(from_status)
    assert can_update_run(from_status, to_status) is expected


def test_run_table_covers_every_status_and_terminals_are_final():
    assert set(RUN_TRANSITIONS) == set(RunStatus)
    for status in TERMINAL:
        assert RUN_TRANSITIONS[status] == frozenset()
    assert all(RunStatus.QUEUED not in targets for targets in RUN_TRANSITIONS.values())


def test_can_update_run_accepts_plain_strings():
    assert can_update_run("running", "completed")
    assert not can_update_run("completed", "running")
