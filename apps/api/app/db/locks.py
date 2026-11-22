"""PostgreSQL transaction-level advisory locks.

A lock is taken with ``pg_advisory_xact_lock(namespace, hashtext(key))`` and released when the
transaction commits or rolls back. Each namespace keeps one kind of key apart from the others.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

EVENT_LOCK = 6001  # one DetectionEvent.event_id: makes ingest idempotent under parallel retries
REF_CODE_LOCK = 6002  # one year of ref_code numbers


def advisory_xact_lock(session: Session, namespace: int, key: str) -> None:
    """Block until this transaction holds the lock for ``key`` in ``namespace``."""
    session.execute(select(func.pg_advisory_xact_lock(namespace, func.hashtext(key))))
