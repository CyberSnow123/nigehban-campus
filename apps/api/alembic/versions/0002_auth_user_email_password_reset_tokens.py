"""auth: user email, password reset tokens

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-22 21:36:50.027534
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "password_reset_tokens",
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=30), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "token_hash ~ '^[0-9a-f]{64}$'", name=op.f("ck_password_reset_tokens_token_hash_format")
        ),
        sa.CheckConstraint(
            "expires_at > created_at", name=op.f("ck_password_reset_tokens_expires_after_created")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_password_reset_tokens_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("token_hash", name=op.f("pk_password_reset_tokens")),
    )
    op.create_index(
        "ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"], unique=False
    )
    op.add_column("users", sa.Column("email", sa.String(length=254), nullable=True))
    op.add_column(
        "users", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_unique_constraint(op.f("uq_users_email"), "users", ["email"])
    # Autogenerate does not detect check constraints on existing tables.
    op.create_check_constraint(
        op.f("ck_users_username_lowercase"), "users", "username = lower(username)"
    )
    op.create_check_constraint(op.f("ck_users_email_lowercase"), "users", "email = lower(email)")


def downgrade() -> None:
    op.drop_constraint(op.f("ck_users_email_lowercase"), "users", type_="check")
    op.drop_constraint(op.f("ck_users_username_lowercase"), "users", type_="check")
    op.drop_constraint(op.f("uq_users_email"), "users", type_="unique")
    op.drop_column("users", "password_changed_at")
    op.drop_column("users", "email")
    op.drop_index("ix_password_reset_tokens_user_id", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
