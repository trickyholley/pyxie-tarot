import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-do-not-use-in-production")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://localhost:5432/pyxie_tarot_test")
