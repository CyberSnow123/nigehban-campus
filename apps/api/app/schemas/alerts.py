"""Query parameters of ``GET /api/alerts`` (Backend.md §3). API-only: no other service uses them."""

from typing import Annotated, Literal

from nigehban_contracts import AlertStatus, EventType
from nigehban_contracts.ids import CameraId, RunId
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

StatusFilter = AlertStatus | Literal["open", "closed"]

MAX_PAGE_SIZE = 100


class AlertListQuery(BaseModel):
    # Unknown query keys are ignored, so a cache-busting ``?t=`` does not break the list.
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    status: StatusFilter | None = Field(
        default=None, description="One status, or `open` (active + acknowledged) or `closed`"
    )
    type: EventType | None = None
    camera_id: CameraId | None = None
    run_id: RunId | None = None
    person: Annotated[int | None, Field(ge=0, description="Track ID, owner or carrier")] = None
    q: Annotated[
        str | None,
        Field(
            max_length=100,
            description=(
                "`person 12` / `P12` (owner or carrier), `bag 31` / `Handbag #31`, "
                "a number `12` (any track), `theft` / `abandoned`, or part of the ref code, "
                "camera name or location"
            ),
        ),
    ] = None
    from_: Annotated[AwareDatetime | None, Field(alias="from")] = None
    to: AwareDatetime | None = None
    is_demo: bool | None = None
    page: Annotated[int, Field(ge=1)] = 1
    page_size: Annotated[int, Field(ge=1, le=MAX_PAGE_SIZE)] = 20

    @field_validator("q")
    @classmethod
    def _blank_is_none(cls, value: str | None) -> str | None:
        value = value.strip() if value else None
        return value or None
