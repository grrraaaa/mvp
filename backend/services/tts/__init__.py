"""TTS — только Deepgram Aura."""
from __future__ import annotations

from core.config import settings
from services.tts.deepgram import synthesize_speech as deepgram_synthesize
from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.text import clean_text_for_tts

__all__ = [
    "TtsNotConfiguredError",
    "TtsProviderError",
    "clean_text_for_tts",
    "get_tts_provider",
    "synthesize_speech",
]


def get_tts_provider() -> str | None:
    if settings.DEEPGRAM_API_KEY:
        return "deepgram"
    return None


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    if not settings.DEEPGRAM_API_KEY:
        raise TtsNotConfiguredError("Задайте DEEPGRAM_API_KEY в .env")
    return await deepgram_synthesize(text, voice_id=voice_id)
