"""DetectionEvent: the single cv -> api contract (Data-Contracts.md §3)."""

from typing import Annotated, Literal, Self

from pydantic import AfterValidator, Field, StrictBool, field_validator, model_validator

from nigehban_contracts.base import (
    ContractModel,
    FiniteFloat,
    NonNegFloat,
    NonNegInt,
    Unit,
    UtcDatetime,
)
from nigehban_contracts.enums import BagClass, EventSource, EventType
from nigehban_contracts.ids import AlertId, CameraId, EventId, RunId

_Box = tuple[FiniteFloat, FiniteFloat, FiniteFloat, FiniteFloat]


def _check_bbox(box: _Box) -> _Box:
    x1, y1, x2, y2 = box
    if x1 < 0 or y1 < 0 or x2 <= x1 or y2 <= y1:
        raise ValueError("bbox must satisfy 0 <= x1 < x2 and 0 <= y1 < y2")
    return box


BBox = Annotated[_Box, AfterValidator(_check_bbox)]


class BagInfo(ContractModel):
    track_id: NonNegInt
    class_: BagClass = Field(alias="class")
    bbox: BBox


_THEFT_ONLY_FIELDS = ("carrier_track_id", "owner_away_s", "owner_match")


class DetectionEvent(ContractModel):
    schema_version: Literal[1] = 1
    event_id: EventId
    type: EventType
    run_id: RunId
    camera_id: CameraId
    source: EventSource
    occurred_at: UtcDatetime
    video_ts_s: NonNegFloat
    bag: BagInfo
    owner_track_id: NonNegInt | None = None
    carrier_track_id: NonNegInt | None = None
    separation_s: NonNegFloat | None = None
    owner_distance_m: NonNegFloat | None = None
    owner_away_s: NonNegFloat | None = None
    confidence: Unit
    owner_match: Unit | None = None

    @field_validator("schema_version", mode="before")
    @classmethod
    def _no_bool_version(cls, value: object) -> object:
        if isinstance(value, bool):  # True == 1 in Python, so reject it explicitly
            raise ValueError("schema_version must be the integer 1")
        return value

    @model_validator(mode="after")
    def _check_type_conditional_fields(self) -> Self:
        if self.type is EventType.ABANDONED_BAG:
            self._require_only(required=("separation_s",), forbidden=_THEFT_ONLY_FIELDS)
        else:
            self._require_only(required=_THEFT_ONLY_FIELDS, forbidden=("separation_s",))
        return self

    def _require_only(self, required: tuple[str, ...], forbidden: tuple[str, ...]) -> None:
        missing = [name for name in required if getattr(self, name) is None]
        extra = [name for name in forbidden if getattr(self, name) is not None]
        if missing:
            raise ValueError(f"{self.type.value} requires: {', '.join(missing)}")
        if extra:
            raise ValueError(f"{self.type.value} must not set: {', '.join(extra)}")


class IngestEventResponse(ContractModel):
    alert_id: AlertId
    duplicate: StrictBool
