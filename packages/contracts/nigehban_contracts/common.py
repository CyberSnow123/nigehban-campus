"""Small shapes shared by many endpoints: pagination, errors, users."""

from typing import Generic, TypeVar

from nigehban_contracts.base import ContractModel, NonNegInt, PositiveInt
from nigehban_contracts.enums import ErrorCode, UserRole
from nigehban_contracts.ids import UserId

T = TypeVar("T")


class Page(ContractModel, Generic[T]):
    items: list[T]
    total: NonNegInt
    page: PositiveInt
    page_size: PositiveInt


class ErrorDetail(ContractModel):
    code: ErrorCode
    message: str


class ErrorBody(ContractModel):
    error: ErrorDetail


class UserRef(ContractModel):
    id: UserId
    display_name: str


class UserMe(ContractModel):
    id: UserId
    username: str
    display_name: str
    role: UserRole
