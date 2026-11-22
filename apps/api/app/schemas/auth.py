"""Auth request/response bodies. API-only, so they live here and not in the contracts."""

from datetime import datetime
from typing import Annotated, Literal

from nigehban_contracts import UserMe
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
_EMAIL_SHAPE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def _lower(value: str) -> str:
    return value.strip().lower()


Username = Annotated[str, StringConstraints(min_length=1, max_length=64), AfterValidator(_lower)]
Email = Annotated[
    str, StringConstraints(max_length=254, pattern=_EMAIL_SHAPE, strip_whitespace=True),
    AfterValidator(_lower),
]  # fmt: skip
NewPassword = Annotated[str, Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)]


class _Body(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginRequest(_Body):
    username: Username
    password: Annotated[str, Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)]


class LoginResponse(_Body):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    user: UserMe


class ForgotPasswordRequest(_Body):
    email: Email


class ResetPasswordRequest(_Body):
    token: Annotated[str, Field(min_length=20, max_length=200)]
    new_password: NewPassword


class MessageResponse(_Body):
    message: str
