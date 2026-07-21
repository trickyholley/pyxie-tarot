"""add role to users

Revision ID: 8384d7206649
Revises: 395f25063d98
Create Date: 2026-07-20 21:21:05.024186

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8384d7206649"
down_revision: Union[str, Sequence[str], None] = "395f25063d98"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    user_role = sa.Enum("user", "admin", name="user_role")
    user_role.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "users",
        sa.Column("role", user_role, nullable=False, server_default="user"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "role")
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
