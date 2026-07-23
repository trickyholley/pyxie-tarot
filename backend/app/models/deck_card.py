import uuid
from datetime import datetime

from pydantic import BaseModel
from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.schemas.deck_card import DeckCardRead


class DeckCard(Base):
    __tablename__ = "deck_cards"
    __table_args__ = (UniqueConstraint("deck_id", "card", name="deck_cards_deck_id_card_key"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    deck_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("decks.id", ondelete="CASCADE"),
    )
    card: Mapped[str] = mapped_column(Text)
    upright_meaning: Mapped[str] = mapped_column(Text, server_default="")
    reversed_meaning: Mapped[str] = mapped_column(Text, server_default="")
    image_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class PaginatedDeckCards(BaseModel):
    items: list[DeckCardRead]
    total: int
    skip: int
    limit: int
