"""CvConfig: the shape of services/cv/config.json (Data-Contracts.md §7)."""

from typing import Literal

from pydantic import Field

from nigehban_contracts.base import ContractModel, Unit

DEVICE_PATTERN = r"^(auto|cpu|mps|cuda(:\d+)?)$"


class DetectorConfig(ContractModel):
    weights: str = Field(default="yolo26n.pt", min_length=1)
    conf: Unit = 0.35
    imgsz: int = Field(default=960, ge=32)
    device: str = Field(default="auto", pattern=DEVICE_PATTERN)


class TrackerConfig(ContractModel):
    type: Literal["bytetrack"] = "bytetrack"
    track_buffer: int = Field(default=60, ge=1)


class AssociationConfig(ContractModel):
    near_ratio: float = Field(default=1.0, gt=0)
    min_frames: int = Field(default=30, ge=1)


class AbandonConfig(ContractModel):
    away_ratio: float = Field(default=2.5, gt=0)
    threshold_s: float = Field(default=60, gt=0)


class TheftConfig(ContractModel):
    min_displacement_ratio: float = Field(default=1.5, gt=0)
    min_frames: int = Field(default=15, ge=1)
    owner_match_threshold: Unit = 0.6


class OutputConfig(ContractModel):
    annotated_video: bool = True
    events_csv: bool = True
    frame_push_interval_s: float = Field(default=1.0, gt=0)


class ApiConfig(ContractModel):
    base_url: str = "http://localhost:8000"
    api_key_env: str = "NIGEHBAN_WORKER_KEY"


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
