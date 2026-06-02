"""TTS providers — Speechify preferred, Soniox / Deepgram fallback."""
from __future__ import annotations

from core.config import settings
from services.tts.deepgram import synthesize_speech as deepgram_synthesize
from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.soniox import synthesize_speech as soniox_synthesize
from services.tts.speechify import synthesize_speech as speechify_synthesize
from services.tts.text import clean_text_for_tts

__all__ = [
    "TtsNotConfiguredError",
    "TtsProviderError",
    "clean_text_for_tts",
    "get_tts_provider",
    "synthesize_speech",
]


def get_tts_provider() -> str | None:
    if settings.SPEECHIFY_API_KEY:
        return "speechify"
    if settings.SONIOX_API_KEY:
        return "soniox"
    if settings.DEEPGRAM_API_KEY:
        return "deepgram"
    return None


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    if settings.SPEECHIFY_API_KEY:
        return await speechify_synthesize(text, voice_id=voice_id)
    if settings.SONIOX_API_KEY:
        return await soniox_synthesize(text)
    if settings.DEEPGRAM_API_KEY:
        return await deepgram_synthesize(text)
    raise TtsNotConfiguredError(
        "Задайте SPEECHIFY_API_KEY (или SONIOX_API_KEY / DEEPGRAM_API_KEY) в .env"
    )
