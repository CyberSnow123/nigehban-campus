"""Query parameters of ``GET /api/stats/history`` (Backend.md §3)."""

from nigehban_contracts import EventType
from pydantic import BaseModel, ConfigDict, Field, field_validator

HISTORY_RANGES = (1, 7, 30)


class HistoryStatsQuery(BaseModel):
    model_config = ConfigDict(extra="ignore")

    # A plain int, because query values arrive as text and a Literal[1, 7, 30] would not
    # coerce "7". The allowed values are still published in the schema.
    days: int = Field(
        default=7,
        description="Range: the last 1, 7 or 30 days",
        json_schema_extra={"enum": list(HISTORY_RANGES)},
    )
    type: EventType | None = None

    @field_validator("days")
    @classmethod
    def _known_range(cls, value: int) -> int:
        if value not in HISTORY_RANGES:
            raise ValueError("Input should be 1, 7 or 30")
        return value
