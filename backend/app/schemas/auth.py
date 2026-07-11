from enum import StrEnum

from pydantic import BaseModel


class ClientType(StrEnum):
    APP = "app"
    ADMIN = "admin"


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str
    client: ClientType = ClientType.APP
