import pytest
from nigehban_contracts import CvConfig
from pydantic import ValidationError


def test_example_parses(example):
    config = CvConfig.model_validate(example("config"))
    assert config.detector.conf == 0.35
    assert config.abandon.threshold_s == 60


def test_defaults_equal_the_documented_example(example):
    assert CvConfig().model_dump(mode="json") == example("config")


def test_missing_keys_fall_back_to_defaults(example):
    config = CvConfig.model_validate({"abandon": {"threshold_s": 90}})
    assert config.abandon.threshold_s == 90
    assert config.abandon.away_ratio == 2.5
    assert config.detector == CvConfig().detector


def test_empty_object_is_all_defaults(example):
    assert CvConfig.model_validate({}) == CvConfig()


@pytest.mark.parametrize(
    "payload",
    [
        {"unknown": 1},
        {"detector": {"confidence": 0.5}},
        {"theft": {"min_frames": 5, "extra": True}},
    ],
)
def test_unknown_keys_are_rejected_at_any_level(payload):
    with pytest.raises(ValidationError):
        CvConfig.model_validate(payload)


@pytest.mark.parametrize(
    "payload",
    [
        {"detector": {"conf": 1.5}},
        {"detector": {"conf": -0.1}},
        {"detector": {"imgsz": 0}},
        {"detector": {"device": "tpu"}},
        {"detector": {"weights": ""}},
        {"tracker": {"type": "deepsort"}},
        {"tracker": {"track_buffer": 0}},
        {"association": {"near_ratio": 0}},
        {"association": {"min_frames": 0}},
        {"abandon": {"away_ratio": -1}},
        {"abandon": {"threshold_s": 0}},
        {"theft": {"min_displacement_ratio": 0}},
        {"theft": {"min_frames": 0}},
        {"theft": {"owner_match_threshold": 1.2}},
        {"output": {"frame_push_interval_s": 0}},
        {"classes": []},
        {"classes": ["person", "suitcase"]},
    ],
)
def test_out_of_range_values_are_rejected(payload):
    with pytest.raises(ValidationError):
        CvConfig.model_validate(payload)


@pytest.mark.parametrize("device", ["auto", "cpu", "mps", "cuda", "cuda:0", "cuda:1"])
def test_valid_devices(device):
    assert CvConfig.model_validate({"detector": {"device": device}}).detector.device == device
