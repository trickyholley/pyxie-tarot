import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DeckType(enum.StrEnum):
    SYSTEM = "system"
    CUSTOM = "custom"


class DeckCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class DeckUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class DeckRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: str | None
    user_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class AdminDeckRead(DeckRead):
    owner_username: str | None = None
