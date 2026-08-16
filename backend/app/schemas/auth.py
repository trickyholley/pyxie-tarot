# SPDX-License-Identifier: AGPL-3.0-or-later
from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import ClientType, UserRead


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
    refresh_token: str | None = None  # app only - admin has no refresh flow


class LoginRequest(BaseModel):
    username: str
    password: str
    client: ClientType = ClientType.APP


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LogoutRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr
    client: ClientType = ClientType.APP


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class EmailConfirmationRequest(BaseModel):
    email: EmailStr
    client: ClientType = ClientType.APP


class EmailConfirmationConfirm(BaseModel):
    token: str
