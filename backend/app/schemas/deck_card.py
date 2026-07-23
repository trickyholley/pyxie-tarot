import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.tarot import TarotCard

Meaning = Annotated[str, Field(max_length=1000)]


class DeckCardUpdate(BaseModel):
    upright_meaning: Meaning | None = None
    reversed_meaning: Meaning | None = None
    image_url: str | None = Field(default=None, max_length=2000)


class DeckCardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    deck_id: uuid.UUID
    card: TarotCard
    upright_meaning: str
    reversed_meaning: str
    image_url: str | None
    created_at: datetime
    updated_at: datetime
