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

    # ── LLM-нормализатор запросов (services/ai/query_reformulator.py) ────────
    # 1 = переписывать входящее сообщение в каноническую форму через дешёвую
    # LLM перед основным пайплайном; 0 = пропускать как есть.
    # Автоматически 0, если OPENAI_API_KEY пустой.
    LLM_REF_ENABLED: int = 1
    # Модель для нормализации. По умолчанию gpt-4o-mini — дёшево и достаточно
    # для простой JSON-классификации. Если пусто — берётся OPENAI_MODEL.
    LLM_REF_MODEL: str = "gpt-4o-mini"
    # Таймаут одного вызова (сек). Если LLM не уложилась — отдаём оригинал
    # и идём дальше по пайплайну (graceful fallback).
    LLM_REF_TIMEOUT: float = 2.5
    # Размер LRU-кэша нормализованных запросов (по хэшу сообщения).
    LLM_REF_CACHE_SIZE: int = 256
    # Минимальный confidence (0..1) от LLM, чтобы заменить original → canonical.
    # Ниже порога — оставляем как есть.
    LLM_REF_MIN_CONFIDENCE: float = 0.6

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

    # Inworld AI TTS (streaming, сервер)
    # Значение: Base64 после "Basic " или полная строка "Basic ..."
    INWORLD_API_KEY: str = ""
    INWORLD_VOICE_MALE: str = "Nikolai"
    INWORLD_VOICE_FEMALE: str = "Svetlana"
    INWORLD_MODEL_ID: str = "inworld-tts-2"
    INWORLD_LANGUAGE: str = "AUTO"
    INWORLD_DELIVERY_MODE: str = "BALANCED"
    INWORLD_TTS_SPEAKING_RATE: float = 1.0

    # Qwen / CosyVoice TTS (Alibaba Model Studio, Frankfurt EU)
    QWEN_TTS_API_KEY: str = ""
    QWEN_TTS_BASE_URL: str = ""
    QWEN_TTS_VOICE: str = "qwen-male"
    QWEN_TTS_MODEL: str = "qwen3-tts-flash,cosyvoice-v3-flash"

    # Google Cloud TTS (legacy, не используется в UI)
    GOOGLE_TTS_API_KEY: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    GOOGLE_SERVICE_ACCOUNT_JSON: str = ""
    GOOGLE_TTS_VOICE: str = "ru-RU-Wavenet-B"
    GOOGLE_TTS_SPEAKING_RATE: float = 1.0
    GOOGLE_TTS_PITCH: float = 0.0

    # Deepgram Aura TTS (fallback, если Google не настроен)
    DEEPGRAM_API_KEY: str = ""
    DEEPGRAM_TTS_VOICE: str = "arcas"
    DEEPGRAM_TTS_MODEL: str = "aura-2-arcas-en"

    # Голос по умолчанию в UI. Приоритет фактического выбора: Google → Qwen → Edge.
    # Если Google сконфигурён, фронт перевыберет на ru-RU-Wavenet-B / Wavenet-A по полу модели.
    TTS_DEFAULT_VOICE: str = "ru-RU-Wavenet-B"

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
