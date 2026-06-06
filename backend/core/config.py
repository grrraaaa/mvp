from __future__ import annotations
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

from core.db_url import resolve_database_url

# mvp/.env — независимо от cwd при запуске uvicorn
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""  # OpenRouter: https://openrouter.ai/api/v1
    OPENAI_MODEL: str = "gpt-4o"
    OPENROUTER_SITE_URL: str = "http://localhost:3000"
    OPENROUTER_APP_NAME: str = "Sber AI Navigator"

    SECRET_KEY: str = "dev-secret-key-change-in-production"
    # Опорная «сегодняшняя» дата демо-выписки (ДД.ММ.ГГГГ)
    DEMO_STATEMENT_ANCHOR: str = "06.06.2026"
    # PostgreSQL: DATABASE_URL или POSTGRES_URL (Vercel Postgres)
    DATABASE_URL: str = ""

    def model_post_init(self, __context) -> None:
        if not self.DATABASE_URL:
            object.__setattr__(self, "DATABASE_URL", resolve_database_url())

    # ImageToText.com OCR (заполнение платежек с фото)
    IMAGETOTEXT_API_KEY: str = ""
    IMAGETOTEXT_API_SECRET: str = ""

    # Google Cloud TTS (озвучка ассистента — приоритет над Deepgram)
    # Вариант 1: API key (удобно для Vercel) — включите Cloud Text-to-Speech API в GCP
    GOOGLE_TTS_API_KEY: str = ""
    # Вариант 2: путь к JSON сервисного аккаунта (локальная разработка)
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    # Вариант 3: JSON сервисного аккаунта целиком в env (Vercel / serverless)
    GOOGLE_SERVICE_ACCOUNT_JSON: str = ""
    GOOGLE_TTS_VOICE: str = "ru-RU-Neural2-B"
    GOOGLE_TTS_SPEAKING_RATE: float = 1.0
    GOOGLE_TTS_PITCH: float = 0.0

    # Deepgram Aura TTS (fallback, если Google не настроен)
    DEEPGRAM_API_KEY: str = ""
    DEEPGRAM_TTS_VOICE: str = "arcas"
    DEEPGRAM_TTS_MODEL: str = "aura-2-arcas-en"

    # Голос по умолчанию в UI (id из Google или Deepgram каталога)
    TTS_DEFAULT_VOICE: str = "ru-RU-Neural2-B"

    # gTTS — fallback без API-ключей
    GTTS_VOICE: str = "ru-male"

    # Microsoft Edge TTS через edge-tts (fallback для мужского голоса gTTS)
    EDGE_TTS_VOICE: str = "ru-RU-DmitryNeural"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    @property
    def allowed_origins(self) -> List[str]:
        return [part.strip() for part in self.ALLOWED_ORIGINS.split(",") if part.strip()]

    @property
    def ai_provider(self) -> str:
        if not self.OPENAI_API_KEY:
            return "rule-based"
        if "openrouter.ai" in self.OPENAI_BASE_URL:
            return "openrouter"
        if self.OPENAI_BASE_URL:
            return "openai-compatible"
        return "openai"


settings = Settings()
