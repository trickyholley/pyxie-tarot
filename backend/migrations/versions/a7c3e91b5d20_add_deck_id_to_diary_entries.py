"""add deck_id to diary entries

Revision ID: a7c3e91b5d20
Revises: d0703e4f5c4a
Create Date: 2026-09-24 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a7c3e91b5d20"
down_revision: Union[str, Sequence[str], None] = "d0703e4f5c4a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("diary_entries", sa.Column("deck_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "diary_entries_deck_id_fkey", "diary_entries", "decks", ["deck_id"], ["id"], ondelete="SET NULL"
    )
    # Every entry so far was drawn from the (then only) Rider-Waite-Smith deck. No-op where it isn't seeded yet.
    op.execute(
        "UPDATE diary_entries SET deck_id = "
        "(SELECT id FROM decks WHERE name = 'Rider-Waite-Smith' AND user_id IS NULL LIMIT 1)"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("diary_entries_deck_id_fkey", "diary_entries", type_="foreignkey")
    op.drop_column("diary_entries", "deck_id")
