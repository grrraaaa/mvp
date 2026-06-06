"""Лучшие голоса Deepgram Aura-2 для озвучки русского текста (multilingual)."""
from __future__ import annotations

from core.config import settings

# Aura-2 не имеет ru-модели; для русского выбраны featured EN-голоса с чёткой дикцией.
VOICE_CATALOG: list[dict[str, str]] = [
    {
        "id": "arcas",
        "name": "Arcas",
        "label": "Мужской",
        "gender": "male",
        "model": "aura-2-arcas-en",
        "locale": "ru",
        "note": "Natural, Smooth, Clear",
    },
    {
        "id": "orpheus",
        "name": "Orpheus",
        "label": "Мужской (уверенный)",
        "gender": "male",
        "model": "aura-2-orpheus-en",
        "locale": "ru",
        "note": "Professional, Trustworthy",
    },
    {
        "id": "thalia",
        "name": "Thalia",
        "label": "Женский",
        "gender": "female",
        "model": "aura-2-thalia-en",
        "locale": "ru",
        "note": "Clear, Confident, Energetic",
    },
    {
        "id": "helena",
        "name": "Helena",
        "label": "Женский (дружелюбный)",
        "gender": "female",
        "model": "aura-2-helena-en",
        "locale": "ru",
        "note": "Caring, Natural, Friendly",
    },
]

DEEPGRAM_VOICE_IDS = {v["id"] for v in VOICE_CATALOG}
_BY_ID = {v["id"]: v for v in VOICE_CATALOG}
_DEFAULT_VOICE = "arcas"


def resolve_deepgram_model(voice_id: str | None = None) -> str:
    """Преобразует id из UI или .env в model= для Deepgram API."""
    raw = (voice_id or settings.DEEPGRAM_TTS_VOICE or _DEFAULT_VOICE).strip()
    low = raw.lower()
    if low == "alexei":
        low = "arcas"
    if low.startswith("aura-"):
        return raw
    hit = _BY_ID.get(low)
    if hit:
        return hit["model"]
    return f"aura-2-{low}-en"


def list_assistant_voices() -> dict:
    default = (settings.DEEPGRAM_TTS_VOICE or _DEFAULT_VOICE).strip().lower()
    if default == "alexei":
        default = "arcas"
    if default not in _BY_ID and not default.startswith("aura-"):
        default = _DEFAULT_VOICE
    voices = [
        {
            "id": v["id"],
            "name": v["label"],
            "gender": v["gender"],
            "locale": v["locale"],
            "preview_audio": None,
        }
        for v in VOICE_CATALOG
    ]
    return {
        "default_voice": default,
        "model": "deepgram-aura-2",
        "language": "ru-RU",
        "groups": [
            {
                "id": "deepgram",
                "label": "Deepgram",
                "voices": voices,
            }
        ],
    }
