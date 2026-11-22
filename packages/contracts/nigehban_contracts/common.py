"""Small shapes shared by many endpoints: pagination, errors, users."""

from typing import Generic, TypeVar

from pydantic import Field

from nigehban_contracts.base import ContractModel
from nigehban_contracts.enums import ErrorCode, UserRole
from nigehban_contracts.ids import UserId

T = TypeVar("T")


class Page(ContractModel, Generic[T]):
    items: list[T]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)


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
