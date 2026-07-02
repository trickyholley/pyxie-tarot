from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    app_name: str="Pyxie Tarot Dev"
    database_url: str = "postgresql+asyncpg://localhost:5432/pyxie_tarot"
    debug: bool = True
    secret_key: str
    access_token_expires_minutes: int = 30

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
