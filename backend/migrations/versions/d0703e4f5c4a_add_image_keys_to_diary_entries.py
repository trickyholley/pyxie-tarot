"""add image keys to diary entries

Revision ID: d0703e4f5c4a
Revises: 6126149d70b3
Create Date: 2026-09-15 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d0703e4f5c4a"
down_revision: Union[str, Sequence[str], None] = "6126149d70b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("diary_entries", sa.Column("image_key", sa.Text(), nullable=True))
    op.add_column("diary_entries", sa.Column("image_original_key", sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("diary_entries", "image_original_key")
    op.drop_column("diary_entries", "image_key")
