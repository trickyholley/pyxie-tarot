"""add settings to users

Revision ID: 52cc6dd16a5f
Revises: 8751a24fc5e5
Create Date: 2026-08-10 08:17:56.544489

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "52cc6dd16a5f"
down_revision: Union[str, Sequence[str], None] = "8751a24fc5e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column(
            "settings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    # One-time port of the old single-purpose theme column into settings.theme. theme itself stays
    # in place for now (nothing drops it here) - a later migration removes it once no deployed code
    # reads it anymore.
    op.execute("UPDATE users SET settings = jsonb_build_object('theme', theme)")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "settings")
