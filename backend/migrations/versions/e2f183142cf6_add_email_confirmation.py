"""add email confirmation

Revision ID: e2f183142cf6
Revises: a707993ff6fd
Create Date: 2026-07-24 20:25:29.411802

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e2f183142cf6"
down_revision: Union[str, Sequence[str], None] = "a707993ff6fd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "email_confirmation_tokens",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="email_confirmation_tokens_user_id_fkey", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="email_confirmation_tokens_pkey"),
        sa.UniqueConstraint("token_hash", name="email_confirmation_tokens_token_hash_key"),
    )
    op.add_column("users", sa.Column("is_verified", sa.Boolean(), server_default="false", nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "is_verified")
    op.drop_table("email_confirmation_tokens")
