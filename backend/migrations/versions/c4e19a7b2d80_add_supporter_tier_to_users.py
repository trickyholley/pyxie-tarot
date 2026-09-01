"""add supporter tier to users

Revision ID: c4e19a7b2d80
Revises: fb21525bc69f
Create Date: 2026-09-01 16:20:11.402318

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c4e19a7b2d80"
down_revision: Union[str, Sequence[str], None] = "fb21525bc69f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TIER = sa.Enum("fool", "star", "world", name="user_tier")
TIER_SOURCE = sa.Enum("default", "billing", "comp", name="user_tier_source")


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    TIER.create(bind)
    TIER_SOURCE.create(bind)

    op.add_column("users", sa.Column("tier", TIER, nullable=False, server_default="fool"))
    op.add_column("users", sa.Column("tier_source", TIER_SOURCE, nullable=False, server_default="default"))
    op.add_column("users", sa.Column("tier_expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "tier_expires_at")
    op.drop_column("users", "tier_source")
    op.drop_column("users", "tier")

    bind = op.get_bind()
    TIER_SOURCE.drop(bind)
    TIER.drop(bind)
