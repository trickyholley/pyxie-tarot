"""drop users.theme column

Revision ID: c1a74e8b93df
Revises: b8d5306f41ca
Create Date: 2026-09-07 10:02:48.226119

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c1a74e8b93df"
down_revision: Union[str, Sequence[str], None] = "b8d5306f41ca"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# CLAUDE: The contract half of the theme -> settings expand/contract from issue 135. `52cc6dd16a5f`
# copied every row into `settings->'theme'` and nothing has read the column since; the model stopped
# mapping it in the same change, which is why `alembic check` has been reporting it as a stray ever
# since.


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("users", "theme")  # migration-guard: allow


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "users",
        sa.Column(
            "theme",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text('\'{"name": "Pyxie (Default)"}\'::jsonb'),
        ),
    )
    op.execute("UPDATE users SET theme = settings->'theme' WHERE settings ? 'theme'")
