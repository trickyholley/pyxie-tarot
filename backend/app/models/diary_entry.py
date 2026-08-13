# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid
from datetime import date

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.mixins import TimestampedModel


class DiaryEntry(TimestampedModel):
    """A user's saved reading.

    `positions`/`prompts`/`cards` are snapshotted at creation - no FK to `spreads`, so later spread edits don't
    alter history.
    """

    __tablename__ = "diary_entries"
    __table_args__ = (
        CheckConstraint("num_cards >= 1 AND num_cards <= 13", name="diary_entries_num_cards_check"),
        UniqueConstraint("user_id", "entry_date", name="diary_entries_user_id_entry_date_key"),
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
    submitted: Mapped[bool] = mapped_column(Boolean, default=False)
