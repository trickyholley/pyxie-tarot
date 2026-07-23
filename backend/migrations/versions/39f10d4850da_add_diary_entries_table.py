"""add diary entries table

Revision ID: 39f10d4850da
Revises: 50c35f23e344
Create Date: 2026-07-23 15:53:58.831304

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "39f10d4850da"
down_revision: Union[str, Sequence[str], None] = "50c35f23e344"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "diary_entries",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("entry_text", sa.Text(), nullable=False),
        sa.Column("spread_name", sa.Text(), nullable=False),
        sa.Column("num_cards", sa.Integer(), nullable=False),
        sa.Column("positions", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("cards", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("prompts", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("num_cards >= 1 AND num_cards <= 9", name="diary_entries_num_cards_check"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="diary_entries_user_id_fkey", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="diary_entries_pkey"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("diary_entries")
