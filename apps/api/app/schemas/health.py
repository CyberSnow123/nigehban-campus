"""``GET /api/health`` response. API-only (no other service consumes it), so not a contract."""

from typing import Literal

from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok", "degraded"]
    database: Literal["connected", "disconnected"]
