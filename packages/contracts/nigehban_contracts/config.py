"""CvConfig: the shape of services/cv/config.json (Data-Contracts.md §7)."""

from typing import Annotated, Literal

from pydantic import Field

from nigehban_contracts.base import ContractModel, PositiveFloat, PositiveInt, Unit

DEVICE_PATTERN = r"^(auto|cpu|mps|cuda(:\d+)?)$"


class DetectorConfig(ContractModel):
    weights: str = Field(default="yolo26n.pt", min_length=1)
    conf: Unit = 0.35
    imgsz: Annotated[int, Field(ge=32, strict=True)] = 960
    device: str = Field(default="auto", pattern=DEVICE_PATTERN)


class TrackerConfig(ContractModel):
    type: Literal["bytetrack"] = "bytetrack"
    track_buffer: PositiveInt = 60


class AssociationConfig(ContractModel):
    near_ratio: PositiveFloat = 1.0
    min_frames: PositiveInt = 30


class AbandonConfig(ContractModel):
    away_ratio: PositiveFloat = 2.5
    threshold_s: PositiveFloat = 60


class TheftConfig(ContractModel):
    min_displacement_ratio: PositiveFloat = 1.5
    min_frames: PositiveInt = 15
    owner_match_threshold: Unit = 0.6


class OutputConfig(ContractModel):
    annotated_video: bool = Field(default=True, strict=True)
    events_csv: bool = Field(default=True, strict=True)
    frame_push_interval_s: PositiveFloat = 1.0


class ApiConfig(ContractModel):
    base_url: str = Field(default="http://localhost:8000", min_length=1)
    api_key_env: str = Field(default="NIGEHBAN_WORKER_KEY", min_length=1)


class CvConfig(ContractModel):
    classes: list[Literal["person", "handbag", "backpack"]] = Field(
        default_factory=lambda: ["person", "handbag", "backpack"], min_length=1
    )
    detector: DetectorConfig = Field(default_factory=DetectorConfig)
    tracker: TrackerConfig = Field(default_factory=TrackerConfig)
    association: AssociationConfig = Field(default_factory=AssociationConfig)
    abandon: AbandonConfig = Field(default_factory=AbandonConfig)
    theft: TheftConfig = Field(default_factory=TheftConfig)
    output: OutputConfig = Field(default_factory=OutputConfig)
    api: ApiConfig = Field(default_factory=ApiConfig)
