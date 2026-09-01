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

    @property
    def effective_tier(self) -> Tier:
        """The tier actually in force. Deriving this from the stored expiry rather than trusting a
        webhook to write FOOL means a missed cancellation still ends access on time."""
        if self.tier_expires_at is not None and self.tier_expires_at <= datetime.now(UTC):
            return Tier.FOOL
        return self.tier
