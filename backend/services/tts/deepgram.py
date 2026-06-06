"""Deepgram Aura text-to-speech for assistant replies."""
from __future__ import annotations

import httpx

from core.config import settings
from services.tts.deepgram_voices import resolve_deepgram_model
from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.text import clean_text_for_tts

SPEAK_URL = "https://api.deepgram.com/v1/speak"


async def _synthesize_once(payload_text: str, model: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            SPEAK_URL,
            params={"model": model},
            headers={
                "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"text": payload_text},
        )

    if response.status_code >= 400:
        raise TtsProviderError(
            (response.text or "Deepgram TTS error").strip(),
            response.status_code,
        )

    if not response.content:
        raise TtsProviderError("Пустой ответ от Deepgram TTS", 502)

    return response.content


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    if not settings.DEEPGRAM_API_KEY:
        raise TtsNotConfiguredError("Задайте DEEPGRAM_API_KEY в .env")

    payload_text = clean_text_for_tts(text)
    if not payload_text:
        raise TtsProviderError("Пустой текст для озвучки", 400)

    model = resolve_deepgram_model(voice_id)
    fallback = resolve_deepgram_model(settings.DEEPGRAM_TTS_VOICE or "alexei")

    try:
        return await _synthesize_once(payload_text, model)
    except TtsProviderError:
        if model != fallback:
            return await _synthesize_once(payload_text, fallback)
        raise
