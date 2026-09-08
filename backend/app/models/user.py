# SPDX-License-Identifier: AGPL-3.0-or-later
"""User model - auth, per-user settings, and the arcana licence/progression fields.

The licence/arcana_* fields (see app/core/gumroad.py for how billing writes them) are an entitlement
model built to survive a missed webhook: every derived property below reads from stored state as of
"now" rather than trusting a webhook to have already applied its effect, so a webhook that never
arrives just means access lapses on schedule instead of staying open or closing early.
`tier`/`tier_source`/`effective_tier` are the pre-redesign version of the same idea, kept only until
nothing reads them.

Two properties carry non-obvious reasoning worth stating once here rather than at each read site:

- `licence_is_active` treats reaching the World (`arcana_level >= MAX_ARCANA_LEVEL`) as active even
  before `licence` has been flipped to `perpetual`. A fixed-length Gumroad membership has no further
  renewal to trigger that flip if its own `subscription_ended` ping is missed, unlike an ordinary lapse
  (which self-heals via `licence_expires_at` passing on its own).
- `has_redundant_subscription` is deliberately conservative: `gumroad_subscription_id` is never cleared,
  so it can also fire for a subscription that already ended correctly on its own (a single, never-lapsed
  walk to the World ends exactly when its membership does). That false positive costs a wasted check; the
  false negative it avoids - a resubscribe after banking progress reaches the World on *its* subscription's
  Nth charge, not the 21st, since Gumroad's own countdown doesn't know about months banked from a prior
  one - would cost real, silent, ongoing charges instead.
"""

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Integer, Text
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.mixins import TimestampedModel
from app.schemas.tarot import MAJOR_ARCANA, MAX_ARCANA_LEVEL, TarotCard
from app.schemas.user import Licence, Role, Tier, TierSource


def whole_months_between(start: datetime, end: datetime) -> int:
    """Calendar months fully elapsed from `start` to `end`, never negative. Day-of-month decides the
    final month; a shorter target month can leave the last month short (31 Jan -> 28 Feb counts as 0)."""
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
    # Per-user preferences, keyed by domain - see schemas.user.UserSettings for the validated shape.
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
    tier_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    tier_cancels_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    licence: Mapped[Licence] = mapped_column(
        SQLAlchemyEnum(Licence, name="user_licence", values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
        server_default="none",
    )
    licence_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    licence_cancels_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    arcana_months_banked: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    arcana_anchor_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Which Gumroad subscription currently backs the stretch above, if any.
    gumroad_subscription_id: Mapped[str | None] = mapped_column(Text)

    @property
    def licence_is_active(self) -> bool:
        """Whether supporter features are unlocked right now."""
        if self.licence is Licence.NONE:
            return False
        if self.licence in (Licence.PERPETUAL, Licence.COMP):
            return True
        if self.licence is Licence.SUBSCRIPTION and self.arcana_level >= MAX_ARCANA_LEVEL:
            return True
        return self.licence_expires_at is None or self.licence_expires_at > datetime.now(UTC)

    @property
    def stretch_end(self) -> datetime:
        """Effective "now" for measuring the current stretch - capped at `licence_expires_at` for an
        active subscription; uncapped for perpetual/comp."""
        now = datetime.now(UTC)
        if self.licence is Licence.SUBSCRIPTION and self.licence_expires_at is not None:
            return min(now, self.licence_expires_at)
        return now

    @property
    def has_lapsed_stretch(self) -> bool:
        """True when the running stretch's entitled window has already closed."""
        return (
            self.arcana_anchor_at is not None
            and self.licence_expires_at is not None
            and self.licence_expires_at <= datetime.now(UTC)
        )

    @property
    def arcana_level(self) -> int:
        """How far along the journey, 0 (the Fool) to 21 (the World)."""
        level = self.arcana_months_banked
        if self.arcana_anchor_at is not None:
            level += whole_months_between(self.arcana_anchor_at, self.stretch_end)
        return min(MAX_ARCANA_LEVEL, level)

    @property
    def arcana(self) -> TarotCard:
        """The major arcana currently guiding this user."""
        return MAJOR_ARCANA[self.arcana_level]

    @property
    def effective_licence_cancels_at_period_end(self) -> bool:
        """Read the same derived way as `licence_is_active`."""
        return self.licence_cancels_at_period_end and self.licence_is_active

    @property
    def has_redundant_subscription(self) -> bool:
        """True when a UI should suggest checking for (and cancelling) a Gumroad membership that may
        still be billing even though the licence is already permanent."""
        return self.licence_is_permanent and self.gumroad_subscription_id is not None

    @property
    def licence_is_permanent(self) -> bool:
        """True for licences a billing event must never revoke - a bought or earned perpetual
        licence, or an admin's gift."""
        return self.licence in (Licence.PERPETUAL, Licence.COMP)

    @property
    def effective_tier(self) -> Tier:
        """The tier actually in force, derived from the stored expiry."""
        if self.tier_expires_at is not None and self.tier_expires_at <= datetime.now(UTC):
            return Tier.FOOL
        return self.tier

    @property
    def effective_tier_cancels_at_period_end(self) -> bool:
        """Read the same derived way as `effective_tier`."""
        return self.tier_cancels_at_period_end and self.effective_tier is not Tier.FOOL
