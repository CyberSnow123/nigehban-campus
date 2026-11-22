from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.security import hash_password, verify_password
from app.core.settings import API_ROOT, Settings
from app.db.session import get_engine, make_engine
from app.main import create_app

REQUIRED = {"database_url": "postgresql+psycopg://u:p@h/d", "jwt_secret": "j", "worker_key": "w"}


def _client(engine: Engine) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_engine] = lambda: engine
    return TestClient(app)


def test_health_connected(engine: Engine):
    res = _client(engine).get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "database": "connected"}


def test_health_disconnected_hides_details():
    dead = make_engine("postgresql+psycopg://nobody:secret@127.0.0.1:1/none")
    res = _client(dead).get("/api/health")
    assert res.status_code == 503
    assert res.json() == {"status": "degraded", "database": "disconnected"}
    assert "secret" not in res.text


def test_health_in_openapi():
    paths = create_app().openapi()["paths"]
    assert "/api/health" in paths


def test_relative_paths_resolve_against_api_root():
    s = Settings(_env_file=None, data_dir="../../data", cv_config="x/config.json", **REQUIRED)
    assert s.data_dir == (API_ROOT / "../../data").resolve()
    assert s.cv_config == (API_ROOT / "x/config.json").resolve()


def test_absolute_paths_kept(tmp_path: Path):
    s = Settings(_env_file=None, data_dir=tmp_path, **REQUIRED)
    assert s.data_dir == tmp_path


def test_secrets_hidden_in_repr():
    s = Settings(_env_file=None, **REQUIRED)
    assert "j" != str(s.jwt_secret) and s.jwt_secret.get_secret_value() == "j"
    assert "worker_key=SecretStr('**********')" in repr(s)


def test_password_hashing():
    hashed = hash_password("operator123")
    assert hashed != "operator123"
    assert verify_password("operator123", hashed)
    assert not verify_password("nope", hashed)
    assert not verify_password("x", "not-a-hash")
