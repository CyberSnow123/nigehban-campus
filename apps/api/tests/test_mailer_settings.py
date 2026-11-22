"""Mailer backends, settings rules and the committed OpenAPI file."""

import importlib.util
import logging
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.settings import API_ROOT, Settings
from app.services.mailer import (
    ConsoleMailer,
    SmtpMailer,
    get_mailer,
    reset_email_text,
    send_reset_email,
)

REQUIRED = {
    "database_url": "postgresql+psycopg://u:p@h/d",
    "jwt_secret": "j" * 32,
    "worker_key": "w" * 32,
}


class FakeSMTP:
    instances: list["FakeSMTP"] = []

    def __init__(self, host, port, timeout):
        self.host, self.port, self.timeout, self.calls, self.message = host, port, timeout, [], None
        FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self, context=None):
        self.calls.append(("starttls", context is not None))

    def login(self, user, password):
        self.calls.append(("login", user, password))

    def send_message(self, message):
        self.calls.append(("send",))
        self.message = message


@pytest.fixture(autouse=True)
def _reset_fake():
    FakeSMTP.instances.clear()


def _smtp(starttls=True) -> SmtpMailer:
    return SmtpMailer(
        "smtp.example.test",
        587,
        "bot@example.test",
        "app-pass",
        "Nigehban <bot@example.test>",
        starttls,
        FakeSMTP,
    )


def test_smtp_mailer_secures_logs_in_then_sends():
    _smtp().send("op@example.test", "Subject", "Body text")
    smtp = FakeSMTP.instances[0]
    assert (smtp.host, smtp.port, smtp.timeout) == ("smtp.example.test", 587, 10)
    assert [c[0] for c in smtp.calls] == ["starttls", "login", "send"]  # TLS before the password
    assert smtp.calls[0] == ("starttls", True)
    assert smtp.calls[1] == ("login", "bot@example.test", "app-pass")
    msg = smtp.message
    assert (msg["To"], msg["Subject"], msg["From"]) == (
        "op@example.test", "Subject", "Nigehban <bot@example.test>",
    )  # fmt: skip
    assert msg.get_content().strip() == "Body text"


def test_smtp_starttls_can_be_turned_off_for_a_local_server():
    _smtp(starttls=False).send("a@b.test", "s", "b")
    assert [c[0] for c in FakeSMTP.instances[0].calls] == ["login", "send"]


def test_console_mailer_logs_the_message(caplog):
    with caplog.at_level(logging.WARNING, logger="nigehban.mail"):
        ConsoleMailer().send("op@example.test", "Hi", "link here")
    assert "op@example.test" in caplog.text and "link here" in caplog.text


def test_send_reset_email_swallows_and_logs_failures(caplog):
    class Broken:
        def send(self, *_):
            raise TimeoutError("boom")

    send_reset_email(Broken(), "a@b.test", "Op", "http://x/reset?token=t", 30)  # must not raise
    assert "Could not send" in caplog.text


def test_reset_email_text_contains_link_and_lifetime():
    subject, body = reset_email_text("Op", "http://x/reset?token=abc", 30)
    assert "http://x/reset?token=abc" in body and "30 minutes" in body and subject


def test_get_mailer_follows_the_setting():
    assert isinstance(get_mailer(Settings(_env_file=None, **REQUIRED)), ConsoleMailer)
    smtp = Settings(
        _env_file=None, mail_backend="smtp", smtp_user="u@x.test", smtp_password="p", **REQUIRED
    )
    assert isinstance(get_mailer(smtp), SmtpMailer)
    assert smtp.mail_sender == "u@x.test"
    assert (
        Settings(_env_file=None, smtp_from="Team <t@x.test>", **REQUIRED).mail_sender
        == "Team <t@x.test>"
    )


def test_smtp_backend_needs_credentials():
    with pytest.raises(ValidationError, match="SMTP_USER"):
        Settings(_env_file=None, mail_backend="smtp", **REQUIRED)


@pytest.mark.parametrize("field", ["jwt_secret", "worker_key"])
@pytest.mark.parametrize("value", ["", "short", "x" * 31])
def test_secrets_must_be_at_least_32_characters(field, value):
    with pytest.raises(ValidationError, match="at least 32"):
        Settings(_env_file=None, **{**REQUIRED, field: value})


def test_32_character_secret_is_accepted():
    Settings(_env_file=None, **{**REQUIRED, "jwt_secret": "x" * 32})


def test_committed_openapi_file_is_current():
    """If this fails, run ``bun run gen:api`` (apps/web) and commit the result."""
    path = API_ROOT / "scripts" / "export_openapi.py"
    spec = importlib.util.spec_from_file_location("export_openapi", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    committed = Path(module.OPENAPI_PATH)
    assert committed.exists(), "run `bun run gen:api` in apps/web"
    assert committed.read_text(encoding="utf-8") == module.render_schema()
    paths = module.create_app().openapi()["paths"]
    assert {"/api/auth/login", "/api/auth/me", "/api/auth/forgot-password"} <= set(paths)
