import pytest
from nigehban_contracts import (
    EventType,
    IdPrefix,
    format_ref_code,
    is_valid_id,
    new_id,
    validate_id,
)
from nigehban_contracts.ids import AlertId, EventId, RefCode
from pydantic import TypeAdapter, ValidationError


@pytest.mark.parametrize("prefix", list(IdPrefix))
def test_new_id_is_valid_and_unique(prefix):
    first, second = new_id(prefix), new_id(prefix)
    assert first.startswith(f"{prefix.value}_")
    assert is_valid_id(first, prefix)
    assert first != second


def test_new_id_accepts_plain_string_prefix():
    assert is_valid_id(new_id("alt"), "alt")


def test_new_id_rejects_unknown_prefix():
    with pytest.raises(ValueError):
        new_id("xyz")


@pytest.mark.parametrize(
    "value",
    [
        "evt_01JD2X5K3M9QZ8V7T6R4N2B1CD",  # wrong prefix for alt
        "alt_01jd2x5k3m9qz8v7t6r4n2b1cd",  # lowercase
        "alt_01JD2X5K3M9QZ8V7T6R4N2B1C",  # too short
        "alt_01JD2X5K3M9QZ8V7T6R4N2B1CDE",  # too long
        "alt_01JD2X5K3M9QZ8V7T6R4N2B1CI",  # I is not Crockford base32
        "01JD2X5K3M9QZ8V7T6R4N2B1CD",  # no prefix
        "",
    ],
)
def test_alert_id_rejects_bad_values(value):
    assert not is_valid_id(value, IdPrefix.ALERT)
    with pytest.raises(ValueError):
        validate_id(value, IdPrefix.ALERT)
    with pytest.raises(ValidationError):
        TypeAdapter(AlertId).validate_python(value)


def test_validate_id_returns_value_when_valid():
    value = new_id(IdPrefix.EVENT)
    assert validate_id(value, IdPrefix.EVENT) == value
    assert TypeAdapter(EventId).validate_python(value) == value


def test_event_id_type_rejects_alert_prefix():
    with pytest.raises(ValidationError):
        TypeAdapter(EventId).validate_python(new_id(IdPrefix.ALERT))


def test_format_ref_code():
    assert format_ref_code(2026, 4, EventType.POSSIBLE_THEFT) == "SEC-2026-004-T"
    assert format_ref_code(2026, 12, "abandoned_bag") == "SEC-2026-012-A"
    assert format_ref_code(2026, 1234, EventType.ABANDONED_BAG) == "SEC-2026-1234-A"


def test_format_ref_code_rejects_zero_sequence():
    with pytest.raises(ValueError):
        format_ref_code(2026, 0, EventType.ABANDONED_BAG)


@pytest.mark.parametrize("value", ["SEC-2026-004-T", "SEC-2026-001-A", "SEC-2026-1000-A"])
def test_ref_code_accepts_valid(value):
    assert TypeAdapter(RefCode).validate_python(value) == value


@pytest.mark.parametrize(
    "value", ["SEC-26-004-T", "SEC-2026-04-T", "SEC-2026-004-X", "sec-2026-004-t"]
)
def test_ref_code_rejects_invalid(value):
    with pytest.raises(ValidationError):
        TypeAdapter(RefCode).validate_python(value)
