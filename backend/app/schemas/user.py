import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Role(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=254)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    username: str
    email: str
    created_at: datetime
    updated_at: datetime
    role: Role
