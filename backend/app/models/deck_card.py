# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid

from sqlalchemy import ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.mixins import TimestampedModel


class DeckCard(TimestampedModel):
    """One (deck, card) pairing's art/meanings; auto-created for all 78 cards when its `Deck` is created."""

    __tablename__ = "deck_cards"
    __table_args__ = (UniqueConstraint("deck_id", "card", name="deck_cards_deck_id_card_key"),)

    deck_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("decks.id", ondelete="CASCADE"),
    )
    card: Mapped[str] = mapped_column(Text)
    upright_meaning: Mapped[str] = mapped_column(Text, server_default="")
    reversed_meaning: Mapped[str] = mapped_column(Text, server_default="")
    image_url: Mapped[str | None] = mapped_column(Text)
