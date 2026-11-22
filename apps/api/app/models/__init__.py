"""SQLAlchemy tables (Backend.md §4). Importing this package registers them all on Base."""

from app.models.alert import Alert
from app.models.alert_action import AlertAction
from app.models.camera import Camera
from app.models.password_reset_token import PasswordResetToken
from app.models.run import Run
from app.models.user import User

__all__ = ["Alert", "AlertAction", "Camera", "PasswordResetToken", "Run", "User"]
