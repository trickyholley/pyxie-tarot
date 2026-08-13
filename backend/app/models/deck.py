# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.mixins import TimestampedModel


class Deck(TimestampedModel):
    """A user's custom deck, or a system deck (e.g. Rider-Waite-Smith) when `user_id` is null."""

    __tablename__ = "decks"

    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
    )
