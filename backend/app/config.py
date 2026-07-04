from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    APP_NAME: str="Pyxie Tarot Dev"
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/pyxie_tarot"
    DEBUG: bool = True
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRES_MINUTES: int = 30

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
