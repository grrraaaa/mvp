"""Каталог голосов Deepgram Aura для выбора в UI ассистента."""
from __future__ import annotations

from core.config import settings

# id в UI → полное имя модели Deepgram (aura-2-{name}-en)
VOICE_CATALOG: list[dict[str, str]] = [
    {"id": "alexei", "name": "Alexei", "gender": "male", "model": "aura-2-arcas-en"},
    {"id": "arcas", "name": "Arcas", "gender": "male", "model": "aura-2-arcas-en"},
    {"id": "odysseus", "name": "Odysseus", "gender": "male", "model": "aura-2-odysseus-en"},
    {"id": "orpheus", "name": "Orpheus", "gender": "male", "model": "aura-2-orpheus-en"},
    {"id": "apollo", "name": "Apollo", "gender": "male", "model": "aura-2-apollo-en"},
    {"id": "mars", "name": "Mars", "gender": "male", "model": "aura-2-mars-en"},
    {"id": "thalia", "name": "Thalia", "gender": "female", "model": "aura-2-thalia-en"},
    {"id": "aurora", "name": "Aurora", "gender": "female", "model": "aura-2-aurora-en"},
    {"id": "helena", "name": "Helena", "gender": "female", "model": "aura-2-helena-en"},
    {"id": "luna", "name": "Luna", "gender": "female", "model": "aura-2-luna-en"},
]

_BY_ID = {v["id"]: v for v in VOICE_CATALOG}
_BY_MODEL = {v["model"]: v for v in VOICE_CATALOG}


def resolve_deepgram_model(voice_id: str | None = None) -> str:
    """Преобразует id из UI или .env в model= для Deepgram API."""
    raw = (voice_id or settings.DEEPGRAM_TTS_VOICE or "alexei").strip()
    low = raw.lower()
    if low.startswith("aura-"):
        return raw
    hit = _BY_ID.get(low)
    if hit:
        return hit["model"]
    return f"aura-2-{low}-en"


def list_assistant_voices() -> dict:
    default = (settings.DEEPGRAM_TTS_VOICE or "alexei").strip().lower()
    if default not in _BY_ID and not default.startswith("aura-"):
        default = "alexei"
    voices = [
        {
            "id": v["id"],
            "name": v["name"],
            "gender": v["gender"],
            "locale": "en-us",
            "preview_audio": None,
        }
        for v in VOICE_CATALOG
    ]
    return {
        "default_voice": default,
        "model": "deepgram-aura-2",
        "language": "multilingual",
        "groups": [
            {
                "id": "deepgram",
                "label": "Deepgram Aura",
                "voices": voices,
            }
        ],
    }
