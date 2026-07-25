from enum import StrEnum

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserRead


class ClientType(StrEnum):
    APP = "app"
    ADMIN = "admin"


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class LoginRequest(BaseModel):
    username: str
    password: str
    client: ClientType = ClientType.APP


class PasswordResetRequest(BaseModel):
    email: EmailStr
    client: ClientType = ClientType.APP


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class EmailConfirmationRequest(BaseModel):
    email: EmailStr


class EmailConfirmationConfirm(BaseModel):
    token: str
