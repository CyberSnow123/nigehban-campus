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

# Numbers are strict: no bools, no numeric strings, no NaN or infinity. JSON ints are
# still accepted where a float is expected.
_STRICT_FLOAT = {"strict": True, "allow_inf_nan": False}

FiniteFloat = Annotated[float, Field(**_STRICT_FLOAT)]
Unit = Annotated[float, Field(ge=0, le=1, **_STRICT_FLOAT)]
"""A value between 0 and 1 (confidence, similarity)."""

NonNegFloat = Annotated[float, Field(ge=0, **_STRICT_FLOAT)]
PositiveFloat = Annotated[float, Field(gt=0, **_STRICT_FLOAT)]
NonNegInt = Annotated[int, Field(ge=0, strict=True)]
PositiveInt = Annotated[int, Field(ge=1, strict=True)]
