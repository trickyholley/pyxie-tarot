"""add allow_reversed to spreads

Revision ID: 803925a2bf62
Revises: 39f10d4850da
Create Date: 2026-07-23 16:26:57.066412

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "803925a2bf62"
down_revision: Union[str, Sequence[str], None] = "39f10d4850da"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("spreads", sa.Column("allow_reversed", sa.Boolean(), server_default="true", nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("spreads", "allow_reversed")
