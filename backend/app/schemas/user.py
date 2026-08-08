# SPDX-License-Identifier: AGPL-3.0-or-later
import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Role(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"


class ClientType(enum.StrEnum):
    APP = "app"
    ADMIN = "admin"


class ThemeName(enum.StrEnum):
    """Built-in themes selectable today. `UserTheme.name` below stays a plain str (not this enum)
    so a future custom-theme feature can store arbitrary user-chosen names without a migration."""

    PYXIE_DEFAULT = "Pyxie (Default)"
    PYXIE_DARK = "Pyxie Dark"
    PEWTER = "Pewter"
    VIRIDIAN = "Viridian"
    CERULEAN = "Cerulean"
    VERMILLION = "Vermillion"
    CELADON = "Celadon"
    FUCHSIA = "Fuchsia"
    SAFFRON = "Saffron"
    CINNABAR = "Cinnabar"
    LAVENDER = "Lavender"


DEFAULT_THEME_NAME = ThemeName.PYXIE_DEFAULT.value


class UserTheme(BaseModel):
    name: str = Field(max_length=50)
    # Reserved for a future custom-theme editor - unused while only built-in themes exist.
    colors: dict[str, str] | None = None


class UserThemeUpdate(BaseModel):
    name: ThemeName


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)
    client: ClientType = ClientType.APP


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
    is_verified: bool
    theme: UserTheme
