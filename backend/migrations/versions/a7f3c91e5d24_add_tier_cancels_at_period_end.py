"""add tier cancels at period end to users

Revision ID: a7f3c91e5d24
Revises: c4e19a7b2d80
Create Date: 2026-09-06 15:42:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a7f3c91e5d24"
down_revision: Union[str, Sequence[str], None] = "c4e19a7b2d80"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column("tier_cancels_at_period_end", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "tier_cancels_at_period_end")
