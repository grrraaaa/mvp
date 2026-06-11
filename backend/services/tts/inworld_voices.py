"""Inworld TTS voice catalog for assistant UI."""
from __future__ import annotations

from core.config import settings


def _inworld_configured() -> bool:
    return bool(settings.INWORLD_API_KEY.strip())


# Каталог голосов: по два на пол (Голос 1 / Голос 2 в UI).
_INWORLD_VOICE_CATALOG: list[dict] = [
    {
        "id": "Nikolai",
        "name": "Голос 1",
        "short": "Голос 1",
        "gender": "male",
        "locale": "ru-RU",
        "tier": "inworld",
        "description": "Мужской · Nikolai",
        "provider": "inworld",
        "slot": 1,
    },
    {
        "id": "merry-candle-6309__design-voice-4147f476",
        "name": "Голос 2",
        "short": "Голос 2",
        "gender": "male",
        "locale": "ru-RU",
        "tier": "inworld",
        "description": "Мужской · design voice",
        "provider": "inworld",
        "slot": 2,
    },
    {
        "id": "Svetlana",
        "name": "Голос 1",
        "short": "Голос 1",
        "gender": "female",
        "locale": "ru-RU",
        "tier": "inworld",
        "description": "Женский · Svetlana",
        "provider": "inworld",
        "slot": 1,
    },
    {
        "id": "Elena",
        "name": "Голос 2",
        "short": "Голос 2",
        "gender": "female",
        "locale": "ru-RU",
        "tier": "inworld",
        "description": "Женский · Elena",
        "provider": "inworld",
        "slot": 2,
    },
]


def inworld_voice_entries() -> list[dict]:
    if not _inworld_configured():
        return []
    return [{k: v for k, v in entry.items() if k != "slot"} for entry in _INWORLD_VOICE_CATALOG]


def default_inworld_voice() -> str | None:
    if not _inworld_configured():
        return None
    male_default = (settings.INWORLD_VOICE_MALE or "Nikolai").strip()
    for entry in _INWORLD_VOICE_CATALOG:
        if entry["id"] == male_default:
            return entry["id"]
    for entry in _INWORLD_VOICE_CATALOG:
        if entry.get("gender") == "male" and entry.get("slot") == 1:
            return entry["id"]
    return _INWORLD_VOICE_CATALOG[0]["id"] if _INWORLD_VOICE_CATALOG else None


def default_inworld_voice_for_gender(gender: str) -> str | None:
    if not _inworld_configured():
        return None
    g = gender.strip().lower()
    if g == "female":
        female_default = (settings.INWORLD_VOICE_FEMALE or "Svetlana").strip()
        for entry in _INWORLD_VOICE_CATALOG:
            if entry["id"] == female_default:
                return entry["id"]
    for entry in _INWORLD_VOICE_CATALOG:
        if entry.get("gender") == g and entry.get("slot") == 1:
            return entry["id"]
    for entry in _INWORLD_VOICE_CATALOG:
        if entry.get("gender") == g:
            return entry["id"]
    return default_inworld_voice()
