"""add users.deletion_requested_at

Revision ID: 831ef941d3f7
Revises: a7c3e91b5d20
Create Date: 2026-09-26 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "831ef941d3f7"
down_revision: Union[str, Sequence[str], None] = "a7c3e91b5d20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("deletion_requested_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "deletion_requested_at")
