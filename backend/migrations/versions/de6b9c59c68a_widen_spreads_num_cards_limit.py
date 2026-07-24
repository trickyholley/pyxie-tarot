"""widen spreads num cards limit

Revision ID: de6b9c59c68a
Revises: 2f4fcd8182af
Create Date: 2026-07-23 19:49:10.600824

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "de6b9c59c68a"
down_revision: Union[str, Sequence[str], None] = "2f4fcd8182af"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint("spreads_num_cards_check", "spreads", type_="check")
    op.create_check_constraint("spreads_num_cards_check", "spreads", "num_cards >= 1 AND num_cards <= 13")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("spreads_num_cards_check", "spreads", type_="check")
    op.create_check_constraint("spreads_num_cards_check", "spreads", "num_cards >= 1 AND num_cards <= 9")
