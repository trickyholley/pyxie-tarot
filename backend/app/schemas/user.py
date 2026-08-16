# SPDX-License-Identifier: AGPL-3.0-or-later
import enum
import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

REMINDER_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
# Keeps the reminder notification's body short enough to avoid truncation in the Android shade.
REMINDER_MESSAGE_MAX_LENGTH = 150


class Role(enum.StrEnum):
    USER = "user"
    ADMIN = "admin"


class ClientType(enum.StrEnum):
    APP = "app"
    ADMIN = "admin"


class ThemeName(enum.StrEnum):
    """Built-in theme names. `UserTheme.name` stays a plain str since it also holds CUSTOM_THEME_NAME."""

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
    PALLET_PRIDE = "Pallet (Pride)"


DEFAULT_THEME_NAME = ThemeName.PYXIE_DEFAULT.value
CUSTOM_THEME_NAME = "Custom"
# Legacy rows with no "glass" key backfill to this via Pydantic. `/users/me/theme`'s fallback must
# reuse this constant, not a bare False, or selecting a plain theme would silently disable glass.
DEFAULT_GLASS = True


class UserTheme(BaseModel):
    name: str = Field(max_length=50)
    colors: dict[str, str] | None = None
    glass: bool = DEFAULT_GLASS


class UserThemeUpdate(BaseModel):
    name: str = Field(max_length=50)
    colors: dict[str, str] | None = None
    # None preserves whatever's already stored, so a plain theme-selection PATCH can send just
    # {name} without resetting colors/glass.
    glass: bool | None = None

    @model_validator(mode="after")
    def validate_name(self) -> "UserThemeUpdate":
        if self.name not in {t.value for t in ThemeName} | {CUSTOM_THEME_NAME}:
            raise ValueError(f"Unknown theme name: {self.name}")
        if self.colors is not None and self.name != CUSTOM_THEME_NAME:
            raise ValueError(f"colors may only be set when name={CUSTOM_THEME_NAME!r}")
        return self


class UserReminder(BaseModel):
    enabled: bool = False
    # 24h "HH:MM", device-local - there's no stored timezone since the reminder itself is scheduled
    # client-side against the device's local clock.
    time: str | None = None
    # None falls back to the default i18n notification body client-side, rather than storing that
    # default text itself.
    message: str | None = Field(default=None, max_length=REMINDER_MESSAGE_MAX_LENGTH)


class UserReminderUpdate(BaseModel):
    enabled: bool
    time: str | None = None
    message: str | None = Field(default=None, max_length=REMINDER_MESSAGE_MAX_LENGTH)

    @model_validator(mode="after")
    def validate_time(self) -> "UserReminderUpdate":
        if self.time is not None and not REMINDER_TIME_RE.match(self.time):
            raise ValueError("time must be in HH:MM (24h) format")
        if self.enabled and self.time is None:
            raise ValueError("time is required when enabled")
        return self


class UserNotifications(BaseModel):
    # Master switch - individual notification types (reminder, and whatever's added later) only
    # actually fire while this is also on. Kept separate from those types' own `enabled` so turning
    # this off and back on restores each type's prior choice instead of clearing it.
    enabled: bool = False


class UserNotificationsUpdate(BaseModel):
    enabled: bool


class UserSettings(BaseModel):
    """The `users.settings` JSONB column's validated shape - one field per preference domain."""

    theme: UserTheme = Field(default_factory=lambda: UserTheme(name=DEFAULT_THEME_NAME))
    reminder: UserReminder = Field(default_factory=UserReminder)
    notifications: UserNotifications = Field(default_factory=UserNotifications)


MIN_SIGNUP_FORM_FILL_MS = 1500


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)
    client: ClientType = ClientType.APP
    # Anti-bot (issue #164), both optional so non-browser callers (tests, scripts) are unaffected by
    # default. `website` is a honeypot input hidden from real users via CSS - anything filling it in is a
    # bot. `form_fill_ms` is the client-measured time between the form rendering and submission (a
    # duration, not a timestamp, so it can't drift with client/server clock skew) - real users can't fill
    # out a signup form faster than MIN_SIGNUP_FORM_FILL_MS.
    website: str = ""
    form_fill_ms: int = MIN_SIGNUP_FORM_FILL_MS

    @model_validator(mode="after")
    def reject_bot_signup(self) -> "UserCreate":
        if self.website or self.form_fill_ms < MIN_SIGNUP_FORM_FILL_MS:
            raise ValueError("Invalid signup")
        return self


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=254)


class UserEmailUpdate(BaseModel):
    email: EmailStr = Field(max_length=254)


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class UserDeleteConfirm(BaseModel):
    # Re-checked against the caller's own password - a deliberate extra confirmation on an
    # irreversible action, on top of (not instead of) the bearer token's own auth.
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    username: str
    email: str
    created_at: datetime
    updated_at: datetime
    role: Role
    is_verified: bool
    settings: UserSettings
