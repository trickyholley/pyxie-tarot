"""add default uuid generation to users id

Revision ID: ba2e3a00c036
Revises: 7972b8477f21
Create Date: 2026-07-21 15:20:14.301022

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ba2e3a00c036"
down_revision: Union[str, Sequence[str], None] = "7972b8477f21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("users", "id", server_default=sa.text("gen_random_uuid()"))


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column("users", "id", server_default=None)
