"""Numbers and flags are strict: no bools as ints, no numeric strings, no NaN or infinity.

These came from runtime probes during Phase 2 verification.
"""

import math

import pytest
from nigehban_contracts import (
    Alert,
    CvConfig,
    DetectionEvent,
    IngestEventResponse,
    Page,
    RunStatusUpdate,
)
from pydantic import ValidationError


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("owner_track_id", True),
        ("carrier_track_id", "12"),
        ("video_ts_s", "125.4"),
        ("video_ts_s", math.inf),
        ("video_ts_s", math.nan),
        ("owner_away_s", math.inf),
        ("owner_distance_m", math.nan),
        ("confidence", "0.9"),
        ("confidence", True),
        ("schema_version", True),
    ],
)
def test_event_rejects_loose_numbers(example, field, value):
    payload = example("event_theft")
    payload[field] = value
    with pytest.raises(ValidationError):
        DetectionEvent.model_validate(payload)


@pytest.mark.parametrize(
    "bag",
    [
        {"track_id": False, "class": "handbag", "bbox": [1, 2, 3, 4]},
        {"track_id": 1, "class": "handbag", "bbox": [1, 2, math.inf, 4]},
        {"track_id": 1, "class": "handbag", "bbox": ["1", 2, 3, 4]},
    ],
)
def test_bag_rejects_loose_numbers(example, bag):
    payload = example("event_theft")
    payload["bag"] = bag
    with pytest.raises(ValidationError):
        DetectionEvent.model_validate(payload)


def test_json_integers_still_accepted_for_floats(example):
    payload = example("event_theft")
    payload["video_ts_s"] = 125
    payload["confidence"] = 1
    event = DetectionEvent.model_validate_json(
        DetectionEvent.model_validate(payload).model_dump_json()
    )
    assert event.video_ts_s == 125.0


def test_round_trip_never_produces_null_numbers(example):
    dumped = DetectionEvent.model_validate(example("event_theft")).model_dump_json()
    assert "Infinity" not in dumped and "NaN" not in dumped


@pytest.mark.parametrize(
    ("model", "name", "field", "value"),
    [
        (Alert, "alert", "is_demo", "false"),
        (Alert, "alert", "is_demo", 0),
        (IngestEventResponse, "ingest_response", "duplicate", "no"),
        (RunStatusUpdate, "run_status", "frames_processed", "3120"),
        (RunStatusUpdate, "run_status", "fps", math.inf),
    ],
)
def test_read_models_reject_loose_values(example, model, name, field, value):
    payload = example(name)
    payload[field] = value
    with pytest.raises(ValidationError):
        model.model_validate(payload)


def test_page_rejects_string_counts():
    with pytest.raises(ValidationError):
        Page[int].model_validate({"items": [], "total": "3", "page": 1, "page_size": 20})


@pytest.mark.parametrize(
    "payload",
    [
        {"abandon": {"threshold_s": "60"}},
        {"abandon": {"threshold_s": math.inf}},
        {"association": {"min_frames": 30.5}},
        {"detector": {"imgsz": True}},
        {"output": {"annotated_video": "yes"}},
        {"api": {"base_url": ""}},
    ],
)
def test_config_rejects_loose_values(payload):
    with pytest.raises(ValidationError):
        CvConfig.model_validate(payload)
