"""Builders for check constraints, sourced from the contracts so DB and code agree."""

from collections.abc import Iterable
from enum import StrEnum

from nigehban_contracts.ids import ULID_PATTERN, IdPrefix
from sqlalchemy import CheckConstraint


def sql_list(values: Iterable[str]) -> str:
    """``'a', 'b'`` in sorted order, so generated SQL is stable between runs."""
    return ", ".join(f"'{v}'" for v in sorted(values))


def in_values(column: str, values: Iterable[str], name: str | None = None) -> CheckConstraint:
    """``column IN (...)``; nullable columns pass when NULL (SQL check semantics)."""
    return CheckConstraint(f"{column} IN ({sql_list(values)})", name=name or f"{column}_valid")


def in_enum(column: str, enum: type[StrEnum], name: str | None = None) -> CheckConstraint:
    return in_values(column, [member.value for member in enum], name)


def id_format(column: str, prefix: IdPrefix, name: str | None = None) -> CheckConstraint:
    pattern = f"^{prefix.value}_{ULID_PATTERN}$"
    return CheckConstraint(f"{column} ~ '{pattern}'", name=name or f"{column}_format")
