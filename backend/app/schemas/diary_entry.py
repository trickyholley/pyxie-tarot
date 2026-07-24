import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.spread import SpreadPosition
from app.schemas.tarot import TarotCard

EntryText = Annotated[str, Field(min_length=1, max_length=10000)]


class EntryCard(BaseModel):
    position_index: int = Field(ge=0, le=12)
    card: TarotCard
    reversed: bool = False


class PromptReply(BaseModel):
    prompt: str = Field(min_length=1, max_length=200)
    reply: str = Field(default="", max_length=2000)


def _check_unique_position_indices(cards: list[EntryCard]) -> list[EntryCard]:
    indices = [c.position_index for c in cards]
    if len(indices) != len(set(indices)):
        raise ValueError("Position indices must be unique")
    return cards


class DiaryEntryCreate(BaseModel):
    spread_id: uuid.UUID
    entry_date: date | None = None
    entry_text: EntryText
    cards: list[EntryCard] = Field(min_length=1, max_length=13)
    replies: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("cards")
    @classmethod
    def unique_position_indices(cls, cards: list[EntryCard]) -> list[EntryCard]:
        return _check_unique_position_indices(cards)


class DiaryEntryUpdate(BaseModel):
    entry_date: date | None = None
    entry_text: EntryText | None = None
    replies: list[str] | None = Field(default=None, max_length=10)


class DiaryEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    entry_date: date
    entry_text: str
    spread_name: str
    num_cards: int
    positions: list[SpreadPosition]
    cards: list[EntryCard]
    prompts: list[PromptReply]
    created_at: datetime
    updated_at: datetime

    @field_validator("cards")
    @classmethod
    def unique_position_indices(cls, cards: list[EntryCard]) -> list[EntryCard]:
        return _check_unique_position_indices(cards)


class AdminDiaryEntryRead(DiaryEntryRead):
    owner_username: str
