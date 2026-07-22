import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SpreadType(enum.StrEnum):
    SYSTEM = "system"
    CUSTOM = "custom"


class SpreadPosition(BaseModel):
    index: int = Field(ge=0, le=8)
    label: str | None = None


def _check_unique_indices(positions: list[SpreadPosition] | None) -> list[SpreadPosition] | None:
    if positions is None:
        return positions
    indices = [p.index for p in positions]
    if len(indices) != len(set(indices)):
        raise ValueError("Position indices must be unique")
    return positions


class SpreadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    positions: list[SpreadPosition] = Field(min_length=1, max_length=9)
    prompts: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("positions")
    @classmethod
    def unique_indices(cls, positions: list[SpreadPosition]) -> list[SpreadPosition]:
        return _check_unique_indices(positions)


class SpreadUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    positions: list[SpreadPosition] | None = Field(default=None, min_length=1, max_length=9)
    prompts: list[str] | None = Field(default=None, max_length=10)

    @field_validator("positions")
    @classmethod
    def unique_indices(cls, positions: list[SpreadPosition] | None) -> list[SpreadPosition] | None:
        return _check_unique_indices(positions)


class SpreadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: str | None
    num_cards: int
    positions: list[SpreadPosition]
    prompts: list[str]
    user_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class AdminSpreadRead(SpreadRead):
    owner_username: str | None = None
