"""Inworld TTS voice catalog for assistant UI."""
from __future__ import annotations

from core.config import settings


def _inworld_configured() -> bool:
    return bool(settings.INWORLD_API_KEY.strip())


def inworld_voice_entries() -> list[dict]:
    if not _inworld_configured():
        return []

    male_id = settings.INWORLD_VOICE_MALE.strip()
    female_id = settings.INWORLD_VOICE_FEMALE.strip()
    voices: list[dict] = []

    if male_id:
        voices.append(
            {
                "id": male_id,
                "name": "Петя (Inworld)",
                "short": "Петя",
                "gender": "male",
                "locale": "ru-RU",
                "tier": "inworld",
                "description": "Design voice · мужской",
                "provider": "inworld",
            }
        )
    if female_id:
        voices.append(
            {
                "id": female_id,
                "name": "Александра (Inworld)",
                "short": "Александра",
                "gender": "female",
                "locale": "ru-RU",
                "tier": "inworld",
                "description": "Женский голос · AUTO",
                "provider": "inworld",
            }
        )
    return voices


def default_inworld_voice() -> str | None:
    entries = inworld_voice_entries()
    if not entries:
        return None
    for entry in entries:
        if entry.get("gender") == "male":
            return entry["id"]
    return entries[0]["id"]
