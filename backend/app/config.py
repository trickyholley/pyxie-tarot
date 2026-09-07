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
    CONTACT_EMAIL_TO: str = "tricky@pyxietarot.live"
    ALLOW_SEED: bool = False
    REDIS_URL: str = "redis://localhost:6379/0"
    # Gumroad (gumroad.com, issue #79 redesign) - merchant of record for the arcana licence. Replaces
    # Polar, rejected in production onboarding as a restricted business (tarot/spiritual services) -
    # see the vault's "Progressive arcana licence plan" note for the full swap rationale. Optional so
    # dev/CI can boot without them; app/core/gumroad.py 503s a checkout call made without them
    # configured rather than failing at import. Real values: backend/.env locally, Secrets Manager in
    # prod (see CLAUDE.md's infra rule - Claude proposes that diff, doesn't apply it).
    GUMROAD_SELLER_SUBDOMAIN: str | None = None
    GUMROAD_ACCESS_TOKEN: str | None = None
    # CLAUDE: Not a Gumroad-issued secret - Gumroad's Ping mechanism sends no signature to verify a
    # webhook against, so this is a random token we generate ourselves and embed as the last path
    # segment of the webhook URL registered in Gumroad's dashboard - see app/core/gumroad.py's
    # `verify_webhook_payload`.
    GUMROAD_WEBHOOK_SECRET: str | None = None
    # Permalink is the checkout-URL slug (https://<subdomain>.gumroad.com/l/<permalink>); product id is
    # what a webhook payload's `short_product_id` field is matched against - not the `product_id`
    # field, a different and much longer opaque token. Both come straight from Patrick, no API call
    # needed to look them up.
    GUMROAD_PRODUCT_PERMALINK_MONTHLY: str | None = None
    GUMROAD_PRODUCT_ID_MONTHLY: str | None = None
    # CLAUDE: A one-time product, not a membership - buying the perpetual licence outright.
    GUMROAD_PRODUCT_PERMALINK_PERPETUAL: str | None = None
    GUMROAD_PRODUCT_ID_PERPETUAL: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
