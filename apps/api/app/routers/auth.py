from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from nigehban_contracts import UserMe

from app.core.errors import ERROR_RESPONSES
from app.core.rate_limit import limiter, login_limit
from app.core.security import create_access_token
from app.core.settings import Settings, get_settings
from app.routers.deps import CurrentUser, DbSession
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    ResetPasswordRequest,
)
from app.services import auth_service, password_reset_service
from app.services.mailer import get_mailer, send_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"], responses=ERROR_RESPONSES)

FORGOT_MESSAGE = "If that email is registered, a reset link has been sent."


@router.post("/login", response_model=LoginResponse)
@limiter.limit(login_limit)  # every attempt counts, right or wrong; needs `request` below
def login(request: Request, body: LoginRequest, db: DbSession) -> LoginResponse:
    user = auth_service.authenticate(db, body.username, body.password)
    token, expires_at = create_access_token(user.id)
    return LoginResponse(
        access_token=token, expires_at=expires_at, user=auth_service.to_user_me(user)
    )


@router.get("/me", response_model=UserMe)
def me(user: CurrentUser) -> UserMe:
    return auth_service.to_user_me(user)


@router.post(
    "/forgot-password", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED
)
def forgot_password(
    body: ForgotPasswordRequest,
    background: BackgroundTasks,
    db: DbSession,
    settings: Annotated[Settings, Depends(get_settings)],
) -> MessageResponse:
    """Always the same answer, so the endpoint cannot be used to find out who has an account.
    The email (if any) is sent after the response, so timing does not give it away either."""
    issued = password_reset_service.request_reset(db, body.email)
    if issued is not None:
        token, user = issued
        link = f"{settings.web_base_url.rstrip('/')}/reset-password?token={token}"
        minutes = int(password_reset_service.RESET_TOKEN_TTL.total_seconds() // 60)
        background.add_task(
            send_reset_email, get_mailer(settings), user.email, user.display_name, link, minutes
        )
    return MessageResponse(message=FORGOT_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: DbSession) -> MessageResponse:
    password_reset_service.reset_password(db, body.token, body.new_password)
    return MessageResponse(message="Your password has been changed. You can log in now.")
