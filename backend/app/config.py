# SPDX-License-Identifier: AGPL-3.0-or-later
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    APP_NAME: str = "Pyxie Tarot API-DEV"
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/pyxie_tarot"
    # IAM auth (see app/database.py, issue #187) replaces DATABASE_URL's
    # embedded password with a short-lived token fetched per connection -
    # only enabled in prod, where these are set; local dev/CI keep using
    # DATABASE_URL as-is. DATABASE_APP_USER is a dedicated, least-privilege role
    # (see migration 8b37db73a6e7), distinct from DATABASE_URL's master user -
    # migrations still connect as master, only the app's runtime engine uses this.
    DATABASE_USE_IAM_AUTH: bool = False
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_APP_USER: str = "pyxie_app"
    DATABASE_NAME: str = "pyxie_tarot"
    AWS_REGION: str = "us-east-1"
    DEBUG: bool = True
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRES_MINUTES: int = 15  # app; short-lived since it's now backed by a refresh token (issue #170)
    REFRESH_TOKEN_EXPIRES_MINUTES: int = 60 * 24 * 30  # 30 days, rotated on use - app only, admin has no refresh flow
    ADMIN_ACCESS_TOKEN_EXPIRES_MINUTES: int = 60 * 12  # 12 hours, forces roughly-daily admin re-login
    PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: int = 30
    EMAIL_CONFIRMATION_TOKEN_EXPIRES_MINUTES: int = 60 * 24
    FRONTEND_APP_URL: str = "http://localhost:5173"
    FRONTEND_ADMIN_URL: str = "http://localhost:5174"
    RESEND_KEY: str | None = None
    EMAIL_FROM: str = "Pyxie Tarot <noreply@pyxietarot.live>"
    ALLOW_SEED: bool = False
    REDIS_URL: str = "redis://localhost:6379/0"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
