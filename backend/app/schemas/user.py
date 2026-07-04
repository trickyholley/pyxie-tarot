import uuid
import enum
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    username: str
    email: str
    created_at: datetime
    updated_at: datetime
    role: Role

class Role(str, enum.Enum):
    user = "user"
    admin = "admin"
