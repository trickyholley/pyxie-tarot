import uuid
from datetime import date, datetime

from pydantic import BaseModel
from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.schemas.diary_entry import AdminDiaryEntryRead, DiaryEntryRead


class DiaryEntry(Base):
    __tablename__ = "diary_entries"
    __table_args__ = (CheckConstraint("num_cards >= 1 AND num_cards <= 13", name="diary_entries_num_cards_check"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    entry_date: Mapped[date] = mapped_column(Date)
    entry_text: Mapped[str] = mapped_column(Text)
    spread_name: Mapped[str] = mapped_column(Text)
    num_cards: Mapped[int] = mapped_column(Integer)
    positions: Mapped[list[dict]] = mapped_column(JSONB)
    cards: Mapped[list[dict]] = mapped_column(JSONB)
    prompts: Mapped[list[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class PaginatedDiaryEntries(BaseModel):
    items: list[AdminDiaryEntryRead]
    total: int
    skip: int
    limit: int


class PaginatedUserDiaryEntries(BaseModel):
    items: list[DiaryEntryRead]
    total: int
    skip: int
    limit: int
