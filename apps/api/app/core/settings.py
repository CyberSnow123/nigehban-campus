"""API settings from the repo-root ``.env`` (real environment variables win)."""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]  # apps/api
REPO_ROOT = API_ROOT.parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",  # .env also holds DB_PORT for docker compose
    )

    database_url: str
    jwt_secret: SecretStr
    worker_key: SecretStr
    data_dir: Path = Path("../../data")
    cv_config: Path = Path("../../services/cv/config.json")
    cors_origins: list[str] = ["http://localhost:5173"]

    @field_validator("data_dir", "cv_config")
    @classmethod
    def _resolve_against_api_root(cls, value: Path) -> Path:
        """Relative paths are relative to apps/api, whatever the working directory is."""
        return value if value.is_absolute() else (API_ROOT / value).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
