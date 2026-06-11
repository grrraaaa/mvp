"""Inworld AI streaming TTS — NDJSON → MP3."""
from __future__ import annotations

import base64
import json
import logging

import httpx

from core.config import settings
from services.tts.errors import TtsNotConfiguredError, TtsProviderError

logger = logging.getLogger(__name__)

INWORLD_STREAM_URL = "https://api.inworld.ai/tts/v1/voice:stream"


def _auth_header() -> str:
    raw = (settings.INWORLD_API_KEY or "").strip()
    if not raw:
        raise TtsNotConfiguredError("INWORLD_API_KEY не задан в .env")
    if raw.lower().startswith("basic "):
        return raw
    return f"Basic {raw}"


def _parse_ndjson_chunk(line: str) -> bytes | None:
    line = line.strip()
    if not line:
        return None
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        logger.warning("Inworld NDJSON parse skip: %s", line[:120])
        return None
    result = data.get("result") or {}
    audio_b64 = result.get("audioContent") or result.get("audio_content")
    if not audio_b64:
        return None
    return base64.b64decode(audio_b64)


async def synthesize_inworld_speech(text: str, voice_id: str) -> bytes:
    """Stream TTS from Inworld and return concatenated MP3 bytes."""
    voice = (voice_id or settings.INWORLD_VOICE_MALE).strip()
    if not voice:
        raise TtsNotConfiguredError("Не указан voice_id для Inworld TTS")

    payload = {
        "text": text,
        "voice_id": voice,
        "audio_config": {
            "audio_encoding": "MP3",
            "speaking_rate": settings.INWORLD_TTS_SPEAKING_RATE,
        },
        "delivery_mode": settings.INWORLD_DELIVERY_MODE,
        "model_id": settings.INWORLD_MODEL_ID,
        "language": settings.INWORLD_LANGUAGE,
    }

    chunks: list[bytes] = []
    buffer = ""

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            async with client.stream(
                "POST",
                INWORLD_STREAM_URL,
                headers={
                    "Authorization": _auth_header(),
                    "Content-Type": "application/json",
                },
                json=payload,
            ) as response:
                if response.status_code >= 400:
                    body = (await response.aread()).decode("utf-8", errors="replace")[:500]
                    raise TtsProviderError(
                        f"Inworld TTS HTTP {response.status_code}: {body}",
                        status_code=response.status_code,
                    )

                async for piece in response.aiter_text():
                    buffer += piece
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        chunk = _parse_ndjson_chunk(line)
                        if chunk:
                            chunks.append(chunk)

                if buffer.strip():
                    chunk = _parse_ndjson_chunk(buffer)
                    if chunk:
                        chunks.append(chunk)
    except TtsNotConfiguredError:
        raise
    except TtsProviderError:
        raise
    except Exception as exc:
        logger.exception("Inworld TTS failed")
        raise TtsProviderError(f"Inworld TTS: {exc}") from exc

    if not chunks:
        raise TtsProviderError("Inworld вернул пустой аудиопоток")

    return b"".join(chunks)
