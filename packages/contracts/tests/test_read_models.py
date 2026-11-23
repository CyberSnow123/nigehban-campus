import pytest
from nigehban_contracts import (
    Alert,
    AlertAction,
    AlertStatus,
    Camera,
    CloseRequest,
    ErrorBody,
    ErrorCode,
    HistoryStats,
    Page,
    Run,
    RunStatus,
    RunStatusUpdate,
    Stats,
    UserMe,
    UserRole,
)
from pydantic import ValidationError

EXAMPLE_MODELS = [
    ("alert", Alert),
    ("alert_action", AlertAction),
    ("run", Run),
    ("camera", Camera),
    ("user_me", UserMe),
    ("stats", Stats),
    ("history_stats", HistoryStats),
    ("error", ErrorBody),
    ("close_request", CloseRequest),
    ("run_status", RunStatusUpdate),
]


@pytest.mark.parametrize(("name", "model"), EXAMPLE_MODELS)
def test_example_parses_and_round_trips(example, name, model):
    parsed = model.model_validate(example(name))
    assert model.model_validate_json(parsed.model_dump_json()) == parsed


def test_alert_example_values(example):
    alert = Alert.model_validate(example("alert"))
    assert alert.ref_code == "SEC-2026-004-T"
    assert alert.camera.name == "CAM 03"
    assert alert.status is AlertStatus.ACTIVE


def test_alert_with_acknowledger(example):
    payload = example("alert")
    payload["status"] = "acknowledged"
    payload["acknowledged_by"] = {"id": "usr_01JD2T5K3M9QZ8V7T6R4N2B1CD", "display_name": "Op"}
    payload["acknowledged_at"] = "2026-11-22T14:48:00Z"
    alert = Alert.model_validate(payload)
    assert alert.acknowledged_by.display_name == "Op"


@pytest.mark.parametrize(
    ("field", "value"),
    [("ref_code", "bad"), ("status", "open"), ("id", "run_01JD2W5K3M9QZ8V7T6R4N2B1CD")],
)
def test_alert_rejects_bad_values(example, field, value):
    payload = example("alert")
    payload[field] = value
    with pytest.raises(ValidationError):
        Alert.model_validate(payload)


def test_alert_action_rejects_unknown_action(example):
    payload = example("alert_action")
    payload["action"] = "delete"
    with pytest.raises(ValidationError):
        AlertAction.model_validate(payload)


def test_run_values_and_video_path_is_a_file_name(example):
    run = Run.model_validate(example("run"))
    assert run.status is RunStatus.RUNNING
    assert run.video_path == "office_01.mp4"


def test_user_me_role(example):
    assert UserMe.model_validate(example("user_me")).role is UserRole.OPERATOR
    payload = example("user_me")
    payload["role"] = "root"
    with pytest.raises(ValidationError):
        UserMe.model_validate(payload)


def test_stats_rejects_negative_counts(example):
    payload = example("stats")
    payload["active"] = -1
    with pytest.raises(ValidationError):
        Stats.model_validate(payload)


def test_stats_latest_alert_is_optional(example):
    payload = example("stats")
    payload["latest_alert"] = None
    assert Stats.model_validate(payload).latest_alert is None
    del payload["latest_alert"]
    assert Stats.model_validate(payload).latest_alert is None


def test_stats_latest_alert_needs_a_real_id(example):
    payload = example("stats")
    payload["latest_alert"]["id"] = "run_01JD2Y5K3M9QZ8V7T6R4N2B1CD"
    with pytest.raises(ValidationError):
        Stats.model_validate(payload)


def test_history_stats_average_may_be_empty(example):
    payload = example("history_stats")
    payload["avg_response_s"] = None
    assert HistoryStats.model_validate(payload).avg_response_s is None


@pytest.mark.parametrize(("field", "value"), [("total", -1), ("avg_response_s", -0.5)])
def test_history_stats_rejects_negatives(example, field, value):
    payload = example("history_stats")
    payload[field] = value
    with pytest.raises(ValidationError):
        HistoryStats.model_validate(payload)


def test_error_body_example_and_unknown_code(example):
    assert ErrorBody.model_validate(example("error")).error.code is ErrorCode.INVALID_TRANSITION
    payload = example("error")
    payload["error"]["code"] = "BOOM"
    with pytest.raises(ValidationError):
        ErrorBody.model_validate(payload)


@pytest.mark.parametrize(
    "outcome", ["resolved", "false_alarm", "authorised_pickup", "confirmed_theft"]
)
def test_close_request_accepts_closed_statuses(outcome):
    assert CloseRequest(outcome=outcome).note is None


@pytest.mark.parametrize("outcome", ["active", "acknowledged", "nonsense"])
def test_close_request_rejects_open_or_unknown(outcome):
    with pytest.raises(ValidationError):
        CloseRequest(outcome=outcome)


def test_close_request_note_limit():
    CloseRequest(outcome="resolved", note="x" * 500)
    with pytest.raises(ValidationError):
        CloseRequest(outcome="resolved", note="x" * 501)


@pytest.mark.parametrize("status", ["running", "completed", "stopped", "failed"])
def test_run_status_update_accepts_worker_statuses(status):
    assert RunStatusUpdate(status=status, frames_processed=0).fps is None


def test_run_status_update_rejects_queued(example):
    payload = example("run_status")
    payload["status"] = "queued"
    with pytest.raises(ValidationError, match="worker may post"):
        RunStatusUpdate.model_validate(payload)


@pytest.mark.parametrize(("field", "value"), [("frames_processed", -1), ("fps", -0.5)])
def test_run_status_update_rejects_negative(example, field, value):
    payload = example("run_status")
    payload[field] = value
    with pytest.raises(ValidationError):
        RunStatusUpdate.model_validate(payload)


def test_page_of_cameras(example):
    payload = {"items": [example("camera")], "total": 42, "page": 1, "page_size": 20}
    page = Page[Camera].model_validate(payload)
    assert page.total == 42
    assert page.items[0].name == "CAM 03"


@pytest.mark.parametrize(
    "bad",
    [{"total": -1}, {"page": 0}, {"page_size": 0}, {"items": "nope"}],
)
def test_page_rejects_bad_values(bad):
    payload = {"items": [], "total": 0, "page": 1, "page_size": 20} | bad
    with pytest.raises(ValidationError):
        Page[Camera].model_validate(payload)
