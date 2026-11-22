"""Prefixed ULID identifiers and the human reference code (Data-Contracts.md §1)."""

import re
from enum import StrEnum
from typing import Annotated

from pydantic import StringConstraints
from ulid import ULID

from nigehban_contracts.enums import EventType

ULID_PATTERN = "[0-9A-HJKMNP-TV-Z]{26}"


class IdPrefix(StrEnum):
    EVENT = "evt"
    ALERT = "alt"
    ACTION = "act"
    RUN = "run"
    CAMERA = "cam"
    USER = "usr"


def new_id(prefix: IdPrefix | str) -> str:
    """Create a new ID such as ``alt_01JD2X...``. Raises ValueError for an unknown prefix."""
    return f"{IdPrefix(prefix).value}_{ULID()}"


def is_valid_id(value: str, prefix: IdPrefix | str) -> bool:
    return re.fullmatch(f"{IdPrefix(prefix).value}_{ULID_PATTERN}", value) is not None


def validate_id(value: str, prefix: IdPrefix | str) -> str:
    if not is_valid_id(value, prefix):
        raise ValueError(f"expected an ID with prefix '{IdPrefix(prefix).value}_' and a ULID")
    return value


def _id_pattern(prefix: IdPrefix) -> str:
    return f"^{prefix.value}_{ULID_PATTERN}$"


EventId = Annotated[str, StringConstraints(pattern=_id_pattern(IdPrefix.EVENT))]
AlertId = Annotated[str, StringConstraints(pattern=_id_pattern(IdPrefix.ALERT))]
ActionId = Annotated[str, StringConstraints(pattern=_id_pattern(IdPrefix.ACTION))]
RunId = Annotated[str, StringConstraints(pattern=_id_pattern(IdPrefix.RUN))]
CameraId = Annotated[str, StringConstraints(pattern=_id_pattern(IdPrefix.CAMERA))]
UserId = Annotated[str, StringConstraints(pattern=_id_pattern(IdPrefix.USER))]

REF_CODE_PATTERN = r"^SEC-\d{4}-\d{3,}-[AT]$"
RefCode = Annotated[str, StringConstraints(pattern=REF_CODE_PATTERN)]

_REF_SUFFIX = {EventType.ABANDONED_BAG: "A", EventType.POSSIBLE_THEFT: "T"}


def format_ref_code(year: int, sequence: int, event_type: EventType) -> str:
    """Build ``SEC-<YYYY>-<NNN>-<A|T>``. The sequence is per year and starts at 1."""
    if sequence < 1:
        raise ValueError("sequence must be >= 1")
    return f"SEC-{year:04d}-{sequence:03d}-{_REF_SUFFIX[EventType(event_type)]}"
