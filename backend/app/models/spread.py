import uuid
from datetime import datetime

from pydantic import BaseModel
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.schemas.spread import AdminSpreadRead


class Spread(Base):
    __tablename__ = "spreads"
    __table_args__ = (CheckConstraint("num_cards >= 1 AND num_cards <= 13", name="spreads_num_cards_check"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    num_cards: Mapped[int] = mapped_column(Integer)
    positions: Mapped[list[dict]] = mapped_column(JSONB)
    prompts: Mapped[list[str]] = mapped_column(JSONB)
    allow_reversed: Mapped[bool] = mapped_column(Boolean, server_default="true")
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class PaginatedSpreads(BaseModel):
    items: list[AdminSpreadRead]
    total: int
    skip: int
    limit: int
