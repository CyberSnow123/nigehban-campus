"""Seed the dev database. Safe to run more than once: existing rows are left alone.

Usage (from apps/api, after ``uv run alembic upgrade head``): ``uv run python scripts/seed.py``
"""

import sys

from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError

from app.core.settings import get_settings
from app.db.session import get_engine, get_sessionmaker
from app.seed.runner import seed

KINDS = ("users", "cameras", "runs", "alerts", "alert_actions")


def _schema_ready() -> bool:
    try:
        return set(KINDS) <= set(inspect(get_engine()).get_table_names())
    except OperationalError:
        sys.exit("Cannot connect to the database. Is it running, and is DATABASE_URL right?")


def main() -> None:
    if not _schema_ready():
        sys.exit("Tables are missing. Run `uv run alembic upgrade head` first.")
    with get_sessionmaker()() as session:
        created = seed(session, get_settings().data_dir)
    print("Seed done. Created: " + ", ".join(f"{k}={created[k]}" for k in KINDS))
    print("Dev logins: operator/operator123, admin/admin123 (dev only). Alerts are demo data.")


if __name__ == "__main__":
    main()
