"""Shared base model and reusable annotated types for every contract."""

from datetime import UTC, datetime
from typing import Annotated

from pydantic import AfterValidator, AwareDatetime, BaseModel, ConfigDict, Field


class ContractModel(BaseModel):
    """Base for all contracts: unknown keys are rejected, aliases are used on output."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True, serialize_by_alias=True)


def _to_utc(value: datetime) -> datetime:
    return value.astimezone(UTC)


UtcDatetime = Annotated[AwareDatetime, AfterValidator(_to_utc)]
"""Timezone-aware datetime, normalised to UTC."""

Unit = Annotated[float, Field(ge=0, le=1)]
"""A value between 0 and 1 (confidence, similarity)."""

NonNegFloat = Annotated[float, Field(ge=0)]
NonNegInt = Annotated[int, Field(ge=0)]
