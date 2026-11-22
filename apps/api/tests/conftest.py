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
from fastapi.testclient import TestClient
from nigehban_contracts import EventType, IdPrefix, new_id
from sqlalchemy import Engine, create_engine, make_url, text
from sqlalchemy.orm import Session, sessionmaker

# Tests never send real email and never depend on a developer's secrets. Environment variables
# win over .env, and this runs before the first get_settings() call.
os.environ["MAIL_BACKEND"] = "console"
# Many tests log in; the limiter is off by default and switched on by the `limited` fixture.
os.environ["RATE_LIMIT_ENABLED"] = "false"
# DATABASE_URL is deliberately NOT set here: it must come from .env, so the tests can never fall
# back to another project's database on the default port.
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-" + "x" * 32)
os.environ.setdefault("WORKER_KEY", "test-worker-key-" + "x" * 32)

from app.core.security import hash_password  # noqa: E402
from app.core.settings import API_ROOT, get_settings  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models import Alert, Camera, Run, User  # noqa: E402

TEST_DB_NAME = "nigehban_test"
TABLES = ("password_reset_tokens", "alert_actions", "alerts", "runs", "cameras", "users")
PASSWORD = "correct-horse-battery"


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


# ---- HTTP client and auth helpers ------------------------------------------------------


@pytest.fixture
def app(engine: Engine):
    """The real app, with its DB dependency pointed at the test database."""
    application = create_app()
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def _get_db():
        with factory() as session:
            yield session

    application.dependency_overrides[get_db] = _get_db
    return application


@pytest.fixture
def client(app) -> TestClient:
    # Unhandled errors must come back as 500 responses, like in production.
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def create_user(db: Session):
    """``create_user(username, role=..., email=...)``: a committed user with password ``PASSWORD``
    (committed, because requests use their own DB session)."""

    def _create(username: str, role: str = "operator", email: str | None = None) -> User:
        user = User(
            username=username,
            display_name=username.title(),
            email=email,
            password_hash=hash_password(PASSWORD),
            role=role,
        )
        db.add(user)
        db.commit()
        return user

    return _create


@pytest.fixture
def operator(create_user) -> User:
    return create_user("operator", email="operator@example.test")


@pytest.fixture
def admin(create_user) -> User:
    return create_user("admin", role="admin", email="admin@example.test")


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def login(client: TestClient):
    """``login(username)`` -> Authorization header for that user."""

    def _login(username: str, password: str = PASSWORD) -> dict[str, str]:
        res = client.post("/api/auth/login", json={"username": username, "password": password})
        assert res.status_code == 200, res.text
        return bearer(res.json()["access_token"])

    return _login


class RecordingMailer:
    def __init__(self) -> None:
        self.sent: list[dict[str, str]] = []

    def send(self, to: str, subject: str, body: str) -> None:
        self.sent.append({"to": to, "subject": subject, "body": body})


@pytest.fixture
def mailbox(monkeypatch: pytest.MonkeyPatch) -> RecordingMailer:
    """Captures password-reset emails instead of logging them."""
    box = RecordingMailer()
    monkeypatch.setattr("app.routers.auth.get_mailer", lambda settings: box)
    return box
