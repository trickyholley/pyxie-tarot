# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Text
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.mixins import TimestampedModel
from app.schemas.user import Role, Tier, TierSource


class User(TimestampedModel):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(Text, unique=True)
    email: Mapped[str] = mapped_column(Text, unique=True)
    password: Mapped[str] = mapped_column(Text)
    role: Mapped[Role] = mapped_column(
        SQLAlchemyEnum(Role, name="user_role", values_callable=lambda r: [e.value for e in r]),
        nullable=False,
        server_default="user",
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    # Holds all per-user preferences (theme, reminder, ...), keyed by domain - see schemas.user.UserSettings
    # for the validated shape. Missing keys (e.g. a brand-new user) default via UserSettings, not here.
    settings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    tier: Mapped[Tier] = mapped_column(
        SQLAlchemyEnum(Tier, name="user_tier", values_callable=lambda t: [e.value for e in t]),
        nullable=False,
        server_default="fool",
    )
    tier_source: Mapped[TierSource] = mapped_column(
        SQLAlchemyEnum(TierSource, name="user_tier_source", values_callable=lambda t: [e.value for e in t]),
        nullable=False,
        server_default="default",
    )
    # Null never expires - the free tier, or a lifetime WORLD grant.
    tier_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # CLAUDE: True once a billed subscription is set to lapse at `tier_expires_at` rather than renew.
    # Polar keeps `status: "active"` through a cancel-at-period-end, so this is the only thing that
    # distinguishes "renews on that date" from "ends on that date" - the tier itself is unchanged
    # until the period actually elapses (then `effective_tier` handles the lapse).
    tier_cancels_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    @property
    def effective_tier(self) -> Tier:
        """The tier actually in force. Deriving this from the stored expiry rather than trusting a
        webhook to write FOOL means a missed cancellation still ends access on time."""
        if self.tier_expires_at is not None and self.tier_expires_at <= datetime.now(UTC):
            return Tier.FOOL
        return self.tier

    @property
    def effective_tier_cancels_at_period_end(self) -> bool:
        """CLAUDE: Whether a cancellation is still pending, read the same lapse-aware way as
        `effective_tier` - once the period has actually elapsed nothing is pending any more, so a
        missed final webhook can't leave the pair reading "no longer a supporter, cancelling soon".
        """
        return self.tier_cancels_at_period_end and self.effective_tier is not Tier.FOOL
