"""align user text columns

Revision ID: 7972b8477f21
Revises: c7b5d3bf02e0
Create Date: 2026-07-20 21:29:51.864318

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7972b8477f21"
down_revision: Union[str, Sequence[str], None] = "c7b5d3bf02e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.alter_column("users", "username", existing_type=sa.String(length=50), type_=sa.Text())
    op.alter_column("users", "email", existing_type=sa.String(length=255), type_=sa.Text())
    op.alter_column("users", "password", existing_type=sa.String(length=255), type_=sa.Text())
    op.create_unique_constraint("users_username_key", "users", ["username"])
    op.create_unique_constraint("users_email_key", "users", ["email"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("users_email_key", "users", type_="unique")
    op.drop_constraint("users_username_key", "users", type_="unique")
    op.alter_column("users", "password", existing_type=sa.Text(), type_=sa.String(length=255))
    op.alter_column("users", "email", existing_type=sa.Text(), type_=sa.String(length=255))
    op.alter_column("users", "username", existing_type=sa.Text(), type_=sa.String(length=50))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)
