"""Soniox Text-to-Speech REST API."""
from __future__ import annotations

import httpx

from core.config import settings
from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.text import clean_text_for_tts, detect_tts_language

SONIOX_TTS_URL = "https://tts-rt.soniox.com/tts"


def _parse_soniox_error(response: httpx.Response) -> str:
    try:
        data = response.json()
        msg = data.get("error_message") or data.get("detail")
        if msg:
            return str(msg)
    except Exception:
        pass
    return (response.text or "Soniox TTS error").strip()[:500]


async def synthesize_speech(text: str) -> bytes:
    if not settings.SONIOX_API_KEY:
        raise TtsNotConfiguredError("Задайте SONIOX_API_KEY в .env")

    payload_text = clean_text_for_tts(text)
    if not payload_text:
        raise TtsProviderError("Пустой текст для озвучки", 400)

    language = settings.SONIOX_TTS_LANGUAGE.strip() or detect_tts_language(
        payload_text, default="ru"
    )

    body: dict[str, object] = {
        "model": settings.SONIOX_TTS_MODEL,
        "language": language,
        "voice": settings.SONIOX_TTS_VOICE,
        "audio_format": settings.SONIOX_TTS_AUDIO_FORMAT,
        "text": payload_text,
    }
    if settings.SONIOX_TTS_SAMPLE_RATE > 0:
        body["sample_rate"] = settings.SONIOX_TTS_SAMPLE_RATE
    if settings.SONIOX_TTS_BITRATE > 0:
        body["bitrate"] = settings.SONIOX_TTS_BITRATE

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            SONIOX_TTS_URL,
            headers={
                "Authorization": f"Bearer {settings.SONIOX_API_KEY}",
                "Content-Type": "application/json",
            },
            json=body,
        )

    if response.status_code >= 400:
        raise TtsProviderError(_parse_soniox_error(response), response.status_code)

    if not response.content:
        raise TtsProviderError("Пустой ответ от Soniox TTS", 502)

    return response.content
