from datetime import UTC, datetime

import pytest
from nigehban_contracts import BagInfo, DetectionEvent, EventType, IngestEventResponse
from pydantic import ValidationError


def test_theft_example_parses(example):
    event = DetectionEvent.model_validate(example("event_theft"))
    assert event.type is EventType.POSSIBLE_THEFT
    assert event.bag.class_.value == "handbag"
    assert event.carrier_track_id == 12


def test_abandoned_example_parses(example):
    event = DetectionEvent.model_validate(example("event_abandoned"))
    assert event.type is EventType.ABANDONED_BAG
    assert event.separation_s == 62.5


@pytest.mark.parametrize("name", ["event_theft", "event_abandoned"])
def test_json_round_trip_is_lossless(example, name):
    event = DetectionEvent.model_validate(example(name))
    again = DetectionEvent.model_validate_json(event.model_dump_json())
    assert again == event


def test_dump_uses_class_alias(example):
    dumped = DetectionEvent.model_validate(example("event_theft")).model_dump(mode="json")
    assert dumped["bag"]["class"] == "handbag"
    assert "class_" not in dumped["bag"]
    assert dumped["occurred_at"] == "2026-11-22T14:47:05Z"


def test_bag_accepts_python_name_too():
    bag = BagInfo(track_id=1, class_="backpack", bbox=(1, 2, 3, 4))
    assert bag.class_.value == "backpack"


def test_schema_version_defaults_to_one(example):
    payload = example("event_abandoned")
    del payload["schema_version"]
    assert DetectionEvent.model_validate(payload).schema_version == 1


@pytest.mark.parametrize("field", ["carrier_track_id", "owner_away_s", "owner_match"])
def test_theft_only_field_on_abandoned_is_rejected(example, field):
    payload = example("event_abandoned")
    payload[field] = 1
    with pytest.raises(ValidationError, match="must not set"):
        DetectionEvent.model_validate(payload)


def test_separation_on_theft_is_rejected(example):
    payload = example("event_theft")
    payload["separation_s"] = 10.0
    with pytest.raises(ValidationError, match="must not set"):
        DetectionEvent.model_validate(payload)


def test_abandoned_without_separation_is_rejected(example):
    payload = example("event_abandoned")
    payload["separation_s"] = None
    with pytest.raises(ValidationError, match="requires"):
        DetectionEvent.model_validate(payload)


@pytest.mark.parametrize("field", ["carrier_track_id", "owner_away_s", "owner_match"])
def test_theft_missing_required_field_is_rejected(example, field):
    payload = example("event_theft")
    payload[field] = None
    with pytest.raises(ValidationError, match="requires"):
        DetectionEvent.model_validate(payload)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("schema_version", 2),
        ("event_id", "alt_01JD2X5K3M9QZ8V7T6R4N2B1CD"),
        ("run_id", "evt_01JD2X5K3M9QZ8V7T6R4N2B1CD"),
        ("camera_id", "cam_bad"),
        ("type", "theft"),
        ("source", "simulated"),
        ("video_ts_s", -0.1),
        ("confidence", 1.5),
        ("confidence", -0.1),
        ("owner_match", 2),
        ("owner_distance_m", -1),
        ("occurred_at", "2026-11-22T14:47:05"),  # naive datetime
        ("occurred_at", "not a date"),
    ],
)
def test_invalid_field_values_are_rejected(example, field, value):
    payload = example("event_theft")
    payload[field] = value
    with pytest.raises(ValidationError):
        DetectionEvent.model_validate(payload)


@pytest.mark.parametrize(
    "bbox",
    [[1, 2, 3], [1, 2, 3, 4, 5], [-1, 0, 5, 5], [10, 0, 5, 5], [0, 10, 5, 5], [0, 0, 0, 5]],
)
def test_invalid_bbox_is_rejected(example, bbox):
    payload = example("event_theft")
    payload["bag"]["bbox"] = bbox
    with pytest.raises(ValidationError):
        DetectionEvent.model_validate(payload)


def test_bag_class_person_is_rejected(example):
    payload = example("event_theft")
    payload["bag"]["class"] = "person"
    with pytest.raises(ValidationError):
        DetectionEvent.model_validate(payload)


def test_unknown_key_is_rejected(example):
    payload = example("event_theft")
    payload["is_demo"] = True  # the API derives it, a worker must not send it
    with pytest.raises(ValidationError):
        DetectionEvent.model_validate(payload)


def test_missing_required_key_is_rejected(example):
    payload = example("event_theft")
    del payload["event_id"]
    with pytest.raises(ValidationError):
        DetectionEvent.model_validate(payload)


def test_offset_datetime_is_normalised_to_utc(example):
    payload = example("event_theft")
    payload["occurred_at"] = "2026-11-22T19:47:05+05:00"
    event = DetectionEvent.model_validate(payload)
    assert event.occurred_at == datetime(2026, 11, 22, 14, 47, 5, tzinfo=UTC)
    assert event.occurred_at.utcoffset().total_seconds() == 0


def test_ingest_response_example(example):
    response = IngestEventResponse.model_validate(example("ingest_response"))
    assert response.duplicate is False
