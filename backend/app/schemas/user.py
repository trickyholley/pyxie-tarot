# SPDX-License-Identifier: AGPL-3.0-or-later
import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class Role(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"


class ClientType(enum.StrEnum):
    APP = "app"
    ADMIN = "admin"


class ThemeName(enum.StrEnum):
    """Built-in theme names. `UserTheme.name` below stays a plain str (not this enum) since it also
    holds CUSTOM_THEME_NAME, which isn't a built-in."""

    PYXIE_DEFAULT = "Pyxie (Default)"
    PYXIE_DARK = "Pyxie Dark"
    PEWTER = "Pewter"
    VIRIDIAN = "Viridian"
    CERULEAN = "Cerulean"
    VERMILION = "Vermilion"
    CELADON = "Celadon"
    FUCHSIA = "Fuchsia"
    SAFFRON = "Saffron"
    CINNABAR = "Cinnabar"
    LAVENDER = "Lavender"
    PALLET_PRIDE = "Pallet Pride"
    LIQUID = "Liquid"


DEFAULT_THEME_NAME = ThemeName.PYXIE_DEFAULT.value
# The one user-custom theme slot's name. Not user-chosen - there's only ever one custom theme per
# user (see UserTheme.colors below), so it doesn't need a name of its own.
CUSTOM_THEME_NAME = "Custom"


class UserTheme(BaseModel):
    name: str = Field(max_length=50)
    # The user's one custom theme's colors, if they've ever created one - persists independently of
    # `name`, i.e. selecting a built-in theme does NOT clear this. Only saving from the custom-theme
    # editor changes it (always paired with name=CUSTOM_THEME_NAME when that happens).
    colors: dict[str, str] | None = None
    # Frosted/liquid-glass prototype (see frontend's globals.css `[data-frosted="true"]` block) -
    # independent of `name`/`colors`, applies on top of whichever theme is active. Defaults off.
    frosted: bool = False


class UserThemeUpdate(BaseModel):
    name: str = Field(max_length=50)
    # Only present when saving from the custom-theme editor - always paired with
    # name=CUSTOM_THEME_NAME. Omitted on a plain theme *selection* (built-in or re-selecting
    # Custom), in which case the route preserves whatever custom colors are already stored -
    # selecting a theme never discards the user's one saved custom palette.
    colors: dict[str, str] | None = None
    # Omitted (None) preserves whatever's already stored, same reasoning as colors above - lets the
    # ThemeSettings frosted checkbox PATCH just `{name, frosted}` without having to resend colors, and
    # lets a plain theme selection PATCH `{name}` without resetting the user's frosted preference.
    frosted: bool | None = None

    @model_validator(mode="after")
    def validate_name(self) -> "UserThemeUpdate":
        if self.name not in {t.value for t in ThemeName} | {CUSTOM_THEME_NAME}:
            raise ValueError(f"Unknown theme name: {self.name}")
        if self.colors is not None and self.name != CUSTOM_THEME_NAME:
            raise ValueError(f"colors may only be set when name={CUSTOM_THEME_NAME!r}")
        return self


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
