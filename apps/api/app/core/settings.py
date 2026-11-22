"""API settings from the repo-root ``.env`` (real environment variables win)."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

import limits
from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]  # apps/api
REPO_ROOT = API_ROOT.parents[1]
MIN_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",  # .env also holds DB_PORT for docker compose
    )

    database_url: str
    jwt_secret: SecretStr
    worker_key: SecretStr
    jwt_expiry_hours: int = 12
    data_dir: Path = Path("../../data")
    cv_config: Path = Path("../../services/cv/config.json")
    cors_origins: list[str] = ["http://localhost:5173"]

    # Password-reset email (Phase 4). "console" logs the link instead of sending it.
    mail_backend: Literal["console", "smtp"] = "console"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_from: str = ""
    smtp_starttls: bool = True  # leave on for Gmail; off only for a local test server
    web_base_url: str = "http://localhost:5173"

    # Login rate limit, counted per client IP address (in memory, so per server process).
    rate_limit_enabled: bool = True
    login_rate_limit: str = "10/minute"  # "<count>/<second|minute|hour>"

    @field_validator("jwt_secret", "worker_key")
    @classmethod
    def _secret_long_enough(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < MIN_SECRET_LENGTH:
            raise ValueError(f"must be at least {MIN_SECRET_LENGTH} characters")
        return value

    @field_validator("login_rate_limit")
    @classmethod
    def _valid_rate_limit(cls, value: str) -> str:
        try:
            parsed = limits.parse_many(value)  # "10/minute" or "10/minute;50/hour"
        except ValueError as exc:
            raise ValueError('use the form "10/minute"') from exc
        if any(item.amount < 1 for item in parsed):
            raise ValueError('the count must be at least 1, for example "10/minute"')
        return value

    @field_validator("data_dir", "cv_config")
    @classmethod
    def _resolve_against_api_root(cls, value: Path) -> Path:
        """Relative paths are relative to apps/api, whatever the working directory is."""
        return value if value.is_absolute() else (API_ROOT / value).resolve()

    @model_validator(mode="after")
    def _smtp_needs_credentials(self) -> "Settings":
        if self.mail_backend == "smtp" and not (self.smtp_user and self.smtp_password):
            raise ValueError("MAIL_BACKEND=smtp needs SMTP_USER and SMTP_PASSWORD")
        return self

    @property
    def mail_sender(self) -> str:
        return self.smtp_from or self.smtp_user or "no-reply@nigehban.local"


@lru_cache
def get_settings() -> Settings:
    return Settings()
