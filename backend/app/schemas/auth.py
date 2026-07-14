from enum import StrEnum

from pydantic import BaseModel

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
