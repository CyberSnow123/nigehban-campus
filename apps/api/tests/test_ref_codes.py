from nigehban_contracts import EventType
from sqlalchemy.orm import Session

from app.services.ref_codes import last_sequence, next_ref_code

THEFT = EventType.POSSIBLE_THEFT
ABANDONED = EventType.ABANDONED_BAG


def test_first_code_of_a_year(db: Session):
    assert last_sequence(db, 2026) == 0
    assert next_ref_code(db, 2026, ABANDONED) == "SEC-2026-001-A"


def test_sequence_counts_both_types_and_is_per_year(db: Session, make_alert):
    db.add(make_alert(ABANDONED, ref_code="SEC-2026-001-A"))
    db.add(make_alert(THEFT, ref_code="SEC-2026-002-T"))
    db.add(make_alert(THEFT, ref_code="SEC-2025-007-T"))
    db.flush()
    assert next_ref_code(db, 2026, THEFT) == "SEC-2026-003-T"
    assert next_ref_code(db, 2025, ABANDONED) == "SEC-2025-008-A"
    assert next_ref_code(db, 2027, ABANDONED) == "SEC-2027-001-A"


def test_sequence_past_999_sorts_numerically(db: Session, make_alert):
    db.add(make_alert(THEFT, ref_code="SEC-2026-999-T"))
    db.add(make_alert(THEFT, ref_code="SEC-2026-1000-T"))
    db.flush()
    assert next_ref_code(db, 2026, ABANDONED) == "SEC-2026-1001-A"
