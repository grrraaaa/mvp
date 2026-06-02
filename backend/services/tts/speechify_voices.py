"""Кэш и подборка голосов Speechify для выбора в UI."""
from __future__ import annotations

import time
from typing import Any

import httpx

from core.config import settings
from services.tts.errors import TtsNotConfiguredError, TtsProviderError

SPEECHIFY_VOICES_URL = "https://api.speechify.ai/v1/voices"

# Популярные shared-голоса с simba-multilingual (русский текст звучит естественно)
MULTILINGUAL_VOICE_PICKS = (
    "george",
    "henry",
    "oliver",
    "dorian",
    "lorne",
    "mark",
    "sabrina",
    "lyla",
    "sienna",
)

_CACHE_TTL_SEC = 3600
_cache: tuple[float, list[dict[str, Any]]] | None = None


def _has_model(voice: dict[str, Any], model_name: str) -> bool:
    return any(m.get("name") == model_name for m in voice.get("models") or [])


def _voice_item(voice: dict[str, Any]) -> dict[str, str | None]:
    return {
        "id": str(voice.get("id") or ""),
        "name": str(voice.get("display_name") or voice.get("id") or ""),
        "gender": voice.get("gender"),
        "locale": voice.get("locale"),
        "preview_audio": voice.get("preview_audio"),
    }


async def _fetch_all_voices() -> list[dict[str, Any]]:
    global _cache
    now = time.monotonic()
    if _cache and now - _cache[0] < _CACHE_TTL_SEC:
        return _cache[1]

    if not settings.SPEECHIFY_API_KEY:
        raise TtsNotConfiguredError("Задайте SPEECHIFY_API_KEY в .env")

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(
            SPEECHIFY_VOICES_URL,
            headers={"Authorization": f"Bearer {settings.SPEECHIFY_API_KEY}"},
        )

    if response.status_code >= 400:
        raise TtsProviderError(
            (response.text or "Speechify voices error").strip()[:500],
            response.status_code,
        )

    data = response.json()
    voices = data if isinstance(data, list) else data.get("voices") or []
    if not isinstance(voices, list):
        voices = []

    _cache = (now, voices)
    return voices


async def list_assistant_voices() -> dict[str, Any]:
    """Голоса для ассистента СберБизнес: нативные ru-RU + избранные multilingual."""
    raw = await _fetch_all_voices()
    by_id = {str(v.get("id")): v for v in raw if v.get("id")}

    ru_native = [
        v
        for v in raw
        if (v.get("locale") or "").startswith("ru")
        and _has_model(v, "simba-multilingual")
    ]
    ru_native.sort(
        key=lambda v: (
            0 if v.get("gender") == "male" else 1,
            str(v.get("display_name") or v.get("id") or "").lower(),
        ),
    )

    intl: list[dict[str, Any]] = []
    for vid in MULTILINGUAL_VOICE_PICKS:
        v = by_id.get(vid)
        if v and _has_model(v, "simba-multilingual"):
            intl.append(v)

    default = (settings.SPEECHIFY_TTS_VOICE or "george").strip()
    if default not in by_id and ru_native:
        default = str(ru_native[0].get("id") or "george")

    groups: list[dict[str, Any]] = []
    if ru_native:
        groups.append(
            {
                "id": "ru",
                "label": "Русские",
                "voices": [_voice_item(v) for v in ru_native],
            }
        )
    if intl:
        groups.append(
            {
                "id": "multilingual",
                "label": "Многоязычные",
                "voices": [_voice_item(v) for v in intl],
            }
        )

    return {
        "default_voice": default,
        "model": settings.SPEECHIFY_TTS_MODEL,
        "language": settings.SPEECHIFY_TTS_LANGUAGE or "ru-RU",
        "groups": groups,
    }
