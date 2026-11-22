"""Test DB fixtures. Tests use a separate ``nigehban_test`` database on the dev server.

URL: ``TEST_DATABASE_URL`` if set, else ``DATABASE_URL`` with the database name swapped.
The schema is built with the real Alembic migration, and tables are emptied after each test.
"""

import os
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from alembic.config import Config
from nigehban_contracts import EventType, IdPrefix, new_id
from sqlalchemy import Engine, create_engine, make_url, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import API_ROOT, get_settings
from app.models import Alert, Camera, Run, User

TEST_DB_NAME = "nigehban_test"
TABLES = ("alert_actions", "alerts", "runs", "cameras", "users")


def _test_url() -> str:
    explicit = os.environ.get("TEST_DATABASE_URL")
    if explicit:
        return explicit
    url = make_url(get_settings().database_url).set(database=TEST_DB_NAME)
    return url.render_as_string(hide_password=False)


def _ensure_database(url: str) -> None:
    """Create the test database if missing. Skips the tests when Postgres is unreachable."""
    target = make_url(url)
    admin = create_engine(target.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as conn:
            exists = conn.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": target.database}
            )
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{target.database}"'))
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"PostgreSQL not reachable for DB tests ({type(exc).__name__})")
    finally:
        admin.dispose()


def alembic_config(url: str) -> Config:
    cfg = Config(str(API_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(API_ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    cfg.attributes["configure_logger"] = False
    return cfg


@pytest.fixture(scope="session")
def db_url() -> str:
    url = _test_url()
    _ensure_database(url)
    return url


@pytest.fixture(scope="session")
def alembic_cfg(db_url: str) -> Config:
    return alembic_config(db_url)


@pytest.fixture(scope="session")
def engine(db_url: str, alembic_cfg: Config) -> Iterator[Engine]:
    from alembic import command

    command.upgrade(alembic_cfg, "head")
    eng = create_engine(db_url)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        with engine.begin() as conn:
            conn.execute(text(f"TRUNCATE {', '.join(TABLES)} CASCADE"))


# ---- row builders for constraint tests -------------------------------------------------


@pytest.fixture
def camera(db: Session) -> Camera:
    cam = Camera(name="CAM T1", location="Test Lab")
    db.add(cam)
    db.flush()
    return cam


@pytest.fixture
def user(db: Session) -> User:
    usr = User(username="tester", display_name="Tester", password_hash="x", role="operator")
    db.add(usr)
    db.flush()
    return usr


@pytest.fixture
def run(db: Session, camera: Camera) -> Run:
    r = Run(camera_id=camera.id, source="mock", is_demo=True, video_path="t.mp4", status="running")
    db.add(r)
    db.flush()
    return r


def alert_values(run: Run, event_type: EventType = EventType.ABANDONED_BAG, **overrides: Any):
    """A valid alert row for ``event_type``; ``overrides`` replace single fields."""
    theft = event_type is EventType.POSSIBLE_THEFT
    values: dict[str, Any] = {
        "ref_code": "SEC-2026-001-T" if theft else "SEC-2026-001-A",
        "event_id": new_id(IdPrefix.EVENT),
        "type": event_type.value,
        "status": "active",
        "is_demo": True,
        "camera_id": run.camera_id,
        "run_id": run.id,
        "occurred_at": datetime(2026, 11, 22, 14, 47, 5, tzinfo=UTC),
        "video_ts_s": 125.4,
        "bag_track_id": 18,
        "bag_class": "handbag",
        "bag_bbox": [812, 440, 905, 560],
        "owner_track_id": 2,
        "carrier_track_id": 12 if theft else None,
        "separation_s": None if theft else 65.0,
        "owner_distance_m": 3.1,
        "owner_away_s": 35.0 if theft else None,
        "confidence": 0.94,
        "owner_match": 0.18 if theft else None,
        "snapshot_path": "snapshots/x/y.jpg",
    }
    values.update(overrides)
    return Alert(**values)


@pytest.fixture
def make_alert(run: Run):
    """``make_alert(event_type, **overrides)`` builds an unsaved, valid Alert on ``run``."""
    return lambda event_type=EventType.ABANDONED_BAG, **kw: alert_values(run, event_type, **kw)


@pytest.fixture
def tmp_data_dir(tmp_path: Path) -> Path:
    return tmp_path / "data"
