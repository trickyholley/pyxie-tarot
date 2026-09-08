"""add gumroad subscription id to users

Revision ID: 6126149d70b3
Revises: c1a74e8b93df
Create Date: 2026-09-07 16:08:01.904273

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "6126149d70b3"
down_revision: Union[str, Sequence[str], None] = "c1a74e8b93df"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("gumroad_subscription_id", sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "gumroad_subscription_id")
