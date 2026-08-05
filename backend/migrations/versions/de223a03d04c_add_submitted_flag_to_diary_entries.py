"""add submitted flag to diary entries

Revision ID: de223a03d04c
Revises: 52e56b9f6e08
Create Date: 2026-08-05 14:22:27.066754

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "de223a03d04c"
down_revision: Union[str, Sequence[str], None] = "52e56b9f6e08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("diary_entries", sa.Column("submitted", sa.Boolean(), server_default="false", nullable=False))
    # Entries created before autosave existed were all created via the old single-shot flow, i.e. already complete.
    op.execute("UPDATE diary_entries SET submitted = true")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("diary_entries", "submitted")
