"""Speechify Text-to-Speech REST API (русский: simba-multilingual + ru-RU)."""
from __future__ import annotations

import base64
import httpx

from core.config import settings
from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.text import clean_text_for_tts, detect_tts_language

SPEECHIFY_TTS_URL = "https://api.speechify.ai/v1/audio/speech"


def _parse_speechify_error(response: httpx.Response) -> str:
    try:
        data = response.json()
        msg = data.get("message") or data.get("error") or data.get("detail")
        if msg:
            return str(msg)
    except Exception:
        pass
    return (response.text or "Speechify TTS error").strip()[:500]


def _decode_audio_payload(data: dict) -> bytes:
    raw = data.get("audio_data") or data.get("audioData")
    if not raw:
        raise TtsProviderError("Speechify: нет audio_data в ответе", 502)
    if isinstance(raw, str):
        try:
            return base64.b64decode(raw)
        except Exception as exc:
            raise TtsProviderError("Speechify: не удалось декодировать audio_data", 502) from exc
    if isinstance(raw, (bytes, bytearray)):
        return bytes(raw)
    raise TtsProviderError("Speechify: неизвестный формат audio_data", 502)


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    if not settings.SPEECHIFY_API_KEY:
        raise TtsNotConfiguredError("Задайте SPEECHIFY_API_KEY в .env")

    payload_text = clean_text_for_tts(text)
    if not payload_text:
        raise TtsProviderError("Пустой текст для озвучки", 400)

    language = settings.SPEECHIFY_TTS_LANGUAGE.strip()
    if not language:
        lang = detect_tts_language(payload_text, default="ru")
        language = "ru-RU" if lang.startswith("ru") else "en-US"

    voice = (voice_id or settings.SPEECHIFY_TTS_VOICE or "george").strip()

    body: dict[str, str] = {
        "input": payload_text,
        "voice_id": voice,
        "audio_format": settings.SPEECHIFY_TTS_AUDIO_FORMAT,
        "model": settings.SPEECHIFY_TTS_MODEL,
        "language": language,
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            SPEECHIFY_TTS_URL,
            headers={
                "Authorization": f"Bearer {settings.SPEECHIFY_API_KEY}",
                "Content-Type": "application/json",
            },
            json=body,
        )

    if response.status_code >= 400:
        raise TtsProviderError(_parse_speechify_error(response), response.status_code)

    try:
        data = response.json()
    except Exception as exc:
        if response.content:
            return response.content
        raise TtsProviderError("Speechify: неверный JSON в ответе", 502) from exc

    audio = _decode_audio_payload(data)
    if not audio:
        raise TtsProviderError("Пустой ответ от Speechify TTS", 502)
    return audio
