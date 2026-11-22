"""Outgoing email. ``console`` logs instead of sending (dev); ``smtp`` sends (Gmail or any SMTP)."""

import logging
import smtplib
import ssl
from collections.abc import Callable
from email.message import EmailMessage
from typing import Protocol

from app.core.settings import Settings

logger = logging.getLogger("nigehban.mail")
SMTP_TIMEOUT_S = 10


class Mailer(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class ConsoleMailer:
    """Dev only: prints the message (including any reset link) to the server log."""

    def send(self, to: str, subject: str, body: str) -> None:
        logger.warning("[console mailer] To: %s | Subject: %s\n%s", to, subject, body)


class SmtpMailer:
    def __init__(  # noqa: PLR0913
        self,
        host: str,
        port: int,
        user: str,
        password: str,
        sender: str,
        starttls: bool = True,
        smtp_factory: Callable[..., smtplib.SMTP] = smtplib.SMTP,
    ):
        self._host, self._port, self._user, self._password = host, port, user, password
        self._sender, self._starttls, self._factory = sender, starttls, smtp_factory

    def send(self, to: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"], message["To"], message["Subject"] = self._sender, to, subject
        message.set_content(body)
        with self._factory(self._host, self._port, timeout=SMTP_TIMEOUT_S) as smtp:
            if self._starttls:
                smtp.starttls(context=ssl.create_default_context())
            smtp.login(self._user, self._password)
            smtp.send_message(message)


def get_mailer(settings: Settings) -> Mailer:
    if settings.mail_backend == "smtp":
        return SmtpMailer(
            settings.smtp_host,
            settings.smtp_port,
            settings.smtp_user,
            settings.smtp_password.get_secret_value(),
            settings.mail_sender,
            settings.smtp_starttls,
        )
    return ConsoleMailer()


def reset_email_text(display_name: str, link: str, ttl_minutes: int) -> tuple[str, str]:
    """Subject and plain-text body of the password-reset email."""
    body = (
        f"Hello {display_name},\n\n"
        "We received a request to reset your Nigehban Campus password. "
        f"Open this link within {ttl_minutes} minutes to choose a new one:\n\n"
        f"{link}\n\n"
        "If you did not ask for this, ignore this email. Your password stays the same.\n"
    )
    return "Reset your Nigehban Campus password", body


def send_reset_email(
    mailer: Mailer, to: str, display_name: str, link: str, ttl_minutes: int
) -> None:
    """Background-task entry point. A failure is logged and never reaches the caller."""
    subject, body = reset_email_text(display_name, link, ttl_minutes)
    try:
        mailer.send(to, subject, body)
    except Exception:  # noqa: BLE001  (SMTP, network and TLS errors all end up here)
        logger.exception("Could not send the password-reset email")
