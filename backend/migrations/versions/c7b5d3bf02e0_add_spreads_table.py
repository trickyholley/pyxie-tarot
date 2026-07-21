"""add spreads table

Revision ID: c7b5d3bf02e0
Revises: 8384d7206649
Create Date: 2026-07-20 21:29:28.421849

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c7b5d3bf02e0"
down_revision: Union[str, Sequence[str], None] = "8384d7206649"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "spreads",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("num_cards", sa.Integer(), nullable=False),
        sa.Column("positions", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("prompts", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.CheckConstraint("num_cards >= 1 AND num_cards <= 9", name="spreads_num_cards_check"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="spreads_user_id_fkey", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="spreads_pkey"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("spreads")
