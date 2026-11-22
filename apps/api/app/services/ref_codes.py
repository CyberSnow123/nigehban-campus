"""Human reference codes: ``SEC-<YYYY>-<NNN>-<A|T>``, one sequence per year for both types."""

from nigehban_contracts import EventType, format_ref_code
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.orm import Session

from app.db.locks import REF_CODE_LOCK, advisory_xact_lock
from app.models import Alert


def last_sequence(session: Session, year: int) -> int:
    """Highest sequence number used in ``year`` (0 when none). Reads ``SEC-YYYY-<NNN>-X``."""
    number = func.split_part(Alert.ref_code, "-", 3)
    stmt = select(func.max(cast(number, Integer))).where(Alert.ref_code.like(f"SEC-{year:04d}-%"))
    return session.scalar(stmt) or 0


def next_ref_code(session: Session, year: int, event_type: EventType) -> str:
    """Next code for ``year``. Takes a per-year transaction lock first, so parallel writers
    get different numbers; the lock is held until the caller commits or rolls back.
    The unique key on ``alerts.ref_code`` stays as the safety net."""
    advisory_xact_lock(session, REF_CODE_LOCK, str(year))
    return format_ref_code(year, last_sequence(session, year) + 1, event_type)
