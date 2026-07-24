"""widen diary entries num cards limit

Revision ID: 781837db80c7
Revises: cefe6d9788fb
Create Date: 2026-07-23 19:59:38.393064

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "781837db80c7"
down_revision: Union[str, Sequence[str], None] = "cefe6d9788fb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint("diary_entries_num_cards_check", "diary_entries", type_="check")
    op.create_check_constraint("diary_entries_num_cards_check", "diary_entries", "num_cards >= 1 AND num_cards <= 13")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("diary_entries_num_cards_check", "diary_entries", type_="check")
    op.create_check_constraint("diary_entries_num_cards_check", "diary_entries", "num_cards >= 1 AND num_cards <= 9")
