# SPDX-License-Identifier: AGPL-3.0-or-later
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Integer, Text
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.mixins import TimestampedModel
from app.schemas.tarot import MAJOR_ARCANA, MAX_ARCANA_LEVEL, TarotCard
from app.schemas.user import Licence, Role, Tier, TierSource


def whole_months_between(start: datetime, end: datetime) -> int:
    """CLAUDE: Calendar months fully elapsed from `start` to `end`, never negative.

    Day-of-month decides the final month: an anchor on the 15th ticks on the 15th. A shorter target
    month can leave the last month short (31 Jan -> 28 Feb counts as 0), which costs at most a day or
    two on one tick and avoids the anchor drifting earlier every month the way clamping would.
    """
    months = (end.year - start.year) * 12 + end.month - start.month
    if (end.day, end.hour, end.minute) < (start.day, start.hour, start.minute):
        months -= 1
    return max(0, months)


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
    # True once a billed subscription is set to lapse at `tier_expires_at` rather than renew.
    tier_cancels_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    # CLAUDE: Whether supporter features are unlocked right now. Replaces tier/tier_source, which are
    # kept alongside until nothing reads them (see the arcana licence plan's phasing).
    licence: Mapped[Licence] = mapped_column(
        SQLAlchemyEnum(Licence, name="user_licence", values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
        server_default="none",
    )
    # Null never expires - no licence at all, or a permanent one (perpetual/comp).
    licence_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    licence_cancels_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    # CLAUDE: The journey, kept separate from the licence so a lapsed supporter keeps the rank they
    # earned. Months from finished stretches are banked here; the current stretch is measured from
    # `arcana_anchor_at`, so a pause holds progress instead of losing or continuing it.
    arcana_months_banked: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    arcana_anchor_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @property
    def licence_is_active(self) -> bool:
        """Read lapse-aware, like `effective_tier` - a missed cancellation webhook still ends access
        on time rather than leaving a subscription unlocked forever."""
        if self.licence is Licence.NONE:
            return False
        if self.licence in (Licence.PERPETUAL, Licence.COMP):
            return True
        return self.licence_expires_at is None or self.licence_expires_at > datetime.now(UTC)

    @property
    def arcana_level(self) -> int:
        """CLAUDE: How far along the journey, 0 (the Fool) to 21 (the World).

        A subscription's stretch is measured only up to `licence_expires_at`, so someone who lapsed
        stays frozen at the guide they reached even if no webhook ever banked it.
        """
        level = self.arcana_months_banked
        if self.arcana_anchor_at is not None:
            end = datetime.now(UTC)
            if self.licence is Licence.SUBSCRIPTION and self.licence_expires_at is not None:
                end = min(end, self.licence_expires_at)
            level += whole_months_between(self.arcana_anchor_at, end)
        return min(MAX_ARCANA_LEVEL, level)

    @property
    def arcana(self) -> TarotCard:
        """The major arcana currently guiding this user."""
        return MAJOR_ARCANA[self.arcana_level]

    @property
    def effective_licence_cancels_at_period_end(self) -> bool:
        """Read the same lapse-aware way as `licence_is_active`, so a missed final webhook can't
        leave the contradictory pair "no longer a supporter, cancelling soon"."""
        return self.licence_cancels_at_period_end and self.licence_is_active

    @property
    def licence_is_permanent(self) -> bool:
        """CLAUDE: True for licences a billing event must never revoke - a bought or earned perpetual
        licence, and an admin's gift. Auto-cancelling at the World means Polar delivers a
        `subscription.canceled` for someone who has just earned one, so guarding only comps (as
        `tier_source` did) would strip it."""
        return self.licence in (Licence.PERPETUAL, Licence.COMP)

    @property
    def effective_tier(self) -> Tier:
        """The tier actually in force. Deriving this from the stored expiry rather than trusting a
        webhook to write FOOL means a missed cancellation still ends access on time."""
        if self.tier_expires_at is not None and self.tier_expires_at <= datetime.now(UTC):
            return Tier.FOOL
        return self.tier

    @property
    def effective_tier_cancels_at_period_end(self) -> bool:
        """Whether a cancellation is still pending, read the same lapse-aware way as
        `effective_tier`.
        """
        return self.tier_cancels_at_period_end and self.effective_tier is not Tier.FOOL
