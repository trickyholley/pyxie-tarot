"""add arcana licence to users

Revision ID: b8d5306f41ca
Revises: a7f3c91e5d24
Create Date: 2026-09-07 09:14:22.517403

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b8d5306f41ca"
down_revision: Union[str, Sequence[str], None] = "a7f3c91e5d24"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LICENCE = sa.Enum("none", "subscription", "perpetual", "comp", name="user_licence")

# Additive only - tier/tier_source/tier_expires_at stay in place and keep being written until
# nothing reads them, since deploy migrates before swapping containers and the old code briefly
# serves against this schema. A later migration drops them.


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    LICENCE.create(bind)

    op.add_column("users", sa.Column("licence", LICENCE, nullable=False, server_default="none"))
    op.add_column("users", sa.Column("licence_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "users",
        sa.Column("licence_cancels_at_period_end", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column("users", sa.Column("arcana_months_banked", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("arcana_anchor_at", sa.DateTime(timezone=True), nullable=True))

    # A comped World was granted as "a complimentary lifetime membership" - the whole journey,
    # already finished - so it backfills to the World rather than restarting the climb. Scoped to
    # World specifically: a lesser comp (e.g. Star) earned no such lifetime grant and must not be
    # bumped up to one just for being comped at all.
    op.execute(
        """
        UPDATE users
           SET licence = 'comp',
               arcana_months_banked = 21,
               arcana_anchor_at = NULL
         WHERE tier_source = 'comp'
           AND tier = 'world'
        """
    )
    # A billed Star becomes a live subscription at the Magician, where a first payment lands, with
    # its stretch anchored now so it keeps climbing from here.
    op.execute(
        """
        UPDATE users
           SET licence = 'subscription',
               licence_expires_at = tier_expires_at,
               licence_cancels_at_period_end = tier_cancels_at_period_end,
               arcana_months_banked = 1,
               arcana_anchor_at = now()
         WHERE tier_source = 'billing'
           AND tier <> 'fool'
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "arcana_anchor_at")
    op.drop_column("users", "arcana_months_banked")
    op.drop_column("users", "licence_cancels_at_period_end")
    op.drop_column("users", "licence_expires_at")
    op.drop_column("users", "licence")

    bind = op.get_bind()
    LICENCE.drop(bind)
