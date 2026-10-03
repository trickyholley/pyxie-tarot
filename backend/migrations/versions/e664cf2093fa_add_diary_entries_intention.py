"""add diary_entries.intention

Revision ID: e664cf2093fa
Revises: 831ef941d3f7
Create Date: 2026-10-01 23:13:34.844576

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e664cf2093fa'
down_revision: Union[str, Sequence[str], None] = '831ef941d3f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('diary_entries', sa.Column('intention', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('diary_entries', 'intention')
