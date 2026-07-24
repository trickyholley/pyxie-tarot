"""add password reset tokens table

Revision ID: a707993ff6fd
Revises: 781837db80c7
Create Date: 2026-07-24 18:17:55.961829

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a707993ff6fd"
down_revision: Union[str, Sequence[str], None] = "781837db80c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="password_reset_tokens_user_id_fkey", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="password_reset_tokens_pkey"),
        sa.UniqueConstraint("token_hash", name="password_reset_tokens_token_hash_key"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("password_reset_tokens")
