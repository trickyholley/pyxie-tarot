# SPDX-License-Identifier: AGPL-3.0-or-later
import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.mixins import TimestampedModel


class Spread(TimestampedModel):
    """A card-layout template, custom or system (`user_id` null).

    `allow_reversed` gates reversed draws at creation; `positions`/`prompts` are snapshotted into any `DiaryEntry`
    drawn from it.
    """

    __tablename__ = "spreads"
    __table_args__ = (CheckConstraint("num_cards >= 1 AND num_cards <= 13", name="spreads_num_cards_check"),)

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
