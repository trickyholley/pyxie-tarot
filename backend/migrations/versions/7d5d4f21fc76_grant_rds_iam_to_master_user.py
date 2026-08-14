"""grant rds_iam to master user

Revision ID: 7d5d4f21fc76
Revises: 52cc6dd16a5f
Create Date: 2026-08-14 08:55:25.054900

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7d5d4f21fc76"
down_revision: Union[str, Sequence[str], None] = "52cc6dd16a5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # rds_iam is an RDS-managed role that only exists once database.tf's
    # iam_database_authentication_enabled has been applied - guarded so this
    # migration is still a no-op against local dev/CI's plain Postgres, which
    # has no such role. Grants IAM-token login to the existing master user
    # (see issue #187) rather than creating a separate app user, since the
    # app already connects as the master user everywhere.
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rds_iam') THEN
                GRANT rds_iam TO pyxie;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rds_iam') THEN
                REVOKE rds_iam FROM pyxie;
            END IF;
        END $$;
    """)
