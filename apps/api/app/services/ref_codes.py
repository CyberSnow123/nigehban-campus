"""Human reference codes: ``SEC-<YYYY>-<NNN>-<A|T>``, one sequence per year for both types."""

from nigehban_contracts import EventType, format_ref_code
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.orm import Session

from app.models import Alert


def last_sequence(session: Session, year: int) -> int:
    """Highest sequence number used in ``year`` (0 when none). Reads ``SEC-YYYY-<NNN>-X``."""
    number = func.split_part(Alert.ref_code, "-", 3)
    stmt = select(func.max(cast(number, Integer))).where(Alert.ref_code.like(f"SEC-{year:04d}-%"))
    return session.scalar(stmt) or 0


def next_ref_code(session: Session, year: int, event_type: EventType) -> str:
    """Next code for ``year``. Not safe under concurrent writers yet (the unique key catches it);
    the ingest service adds locking in Phase 6."""
    return format_ref_code(year, last_sequence(session, year) + 1, event_type)
