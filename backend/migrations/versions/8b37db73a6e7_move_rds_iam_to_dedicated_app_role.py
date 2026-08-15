"""move rds_iam to dedicated app role

Revision ID: 8b37db73a6e7
Revises: 7d5d4f21fc76
Create Date: 2026-08-14 19:12:55.152290

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8b37db73a6e7"
down_revision: Union[str, Sequence[str], None] = "7d5d4f21fc76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 7d5d4f21fc76 granted rds_iam directly to the master user (pyxie). RDS's
    # managed pg_hba.conf routes any rds_iam member through IAM/PAM auth ahead of
    # the password rule though, so that grant also broke pyxie's password login -
    # including migrations/env.py's own connection, which deliberately still uses
    # the master password rather than IAM (a migration granting IAM login can't
    # itself run over a connection that requires that grant to already exist).
    # Net effect: every migration after that one became unrunnable.
    #
    # Fix: move rds_iam to a new, dedicated, least-privilege app role instead of
    # the master user. Migrations keep using the (now working again) master
    # password indefinitely; only the app's runtime connection (app/database.py)
    # authenticates as this role, via IAM. Guarded the same way 7d5d4f21fc76 was -
    # a no-op against local dev/CI's plain Postgres, which has no rds_iam role.
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rds_iam') THEN
                REVOKE rds_iam FROM pyxie;

                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pyxie_app') THEN
                    CREATE ROLE pyxie_app WITH LOGIN;
                END IF;
                GRANT rds_iam TO pyxie_app;

                GRANT USAGE ON SCHEMA public TO pyxie_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pyxie_app;
                -- Migrations keep running as pyxie, so future tables it creates need to
                -- reach pyxie_app automatically - otherwise every migration adding a
                -- table would need a matching manual GRANT here too.
                ALTER DEFAULT PRIVILEGES FOR ROLE pyxie IN SCHEMA public
                    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pyxie_app;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rds_iam') THEN
                ALTER DEFAULT PRIVILEGES FOR ROLE pyxie IN SCHEMA public
                    REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM pyxie_app;
                REVOKE ALL ON ALL TABLES IN SCHEMA public FROM pyxie_app;
                REVOKE USAGE ON SCHEMA public FROM pyxie_app;
                REVOKE rds_iam FROM pyxie_app;
                GRANT rds_iam TO pyxie;
            END IF;
        END $$;
    """)
