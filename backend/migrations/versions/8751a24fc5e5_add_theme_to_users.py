"""add theme to users

Revision ID: 8751a24fc5e5
Revises: de223a03d04c
Create Date: 2026-08-08 15:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "8751a24fc5e5"
down_revision: Union[str, Sequence[str], None] = "de223a03d04c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # The server_default is a constant, so Postgres backfills every existing row to
    # "Pyxie (Default)" in the same statement - exactly the "preserve current look" behavior wanted.
    op.add_column(
        "users",
        sa.Column(
            "theme",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text('\'{"name": "Pyxie (Default)"}\'::jsonb'),
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "theme")
