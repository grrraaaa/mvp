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

    # Speechify TTS (озвучка ответов ассистента, приоритет)
    SPEECHIFY_API_KEY: str = ""
    SPEECHIFY_TTS_MODEL: str = "simba-multilingual"
    SPEECHIFY_TTS_LANGUAGE: str = "ru-RU"
    SPEECHIFY_TTS_VOICE: str = "george"
    SPEECHIFY_TTS_AUDIO_FORMAT: str = "mp3"

    # Soniox TTS (запасной)
    SONIOX_API_KEY: str = ""
    SONIOX_TTS_MODEL: str = "tts-rt-v1"
    SONIOX_TTS_LANGUAGE: str = ""  # пусто = авто ru/en по тексту
    SONIOX_TTS_VOICE: str = "Adrian"
    SONIOX_TTS_AUDIO_FORMAT: str = "mp3"
    SONIOX_TTS_SAMPLE_RATE: int = 0
    SONIOX_TTS_BITRATE: int = 128000

    # Deepgram TTS (запасной вариант, если Soniox не задан)
    DEEPGRAM_API_KEY: str = ""
    DEEPGRAM_TTS_MODEL: str = "aura-2-thalia-en"
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
