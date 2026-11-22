"""FastAPI app factory. From apps/api: ``uv run uvicorn app.main:app --reload --port 8000``."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.core.errors import register_error_handlers
from app.core.rate_limit import limiter
from app.core.settings import get_settings
from app.routers import auth, health


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Nigehban Campus API", version=__version__)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.limiter = limiter  # slowapi looks it up here
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(auth.router)
    return app


app = create_app()
