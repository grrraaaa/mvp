"""Каталог русских голосов gTTS (Google Translate TTS, без API-ключа)."""
from __future__ import annotations

from core.config import settings

# id в UI → параметры gTTS (lang, tld, slow)
VOICE_CATALOG: list[dict[str, str | bool]] = [
    {
        "id": "ru-male",
        "name": "Мужской",
        "gender": "male",
        "lang": "ru",
        "tld": "com",
        "slow": False,
        "locale": "ru-RU",
    },
    {
        "id": "ru-female",
        "name": "Женский",
        "gender": "female",
        "lang": "ru",
        "tld": "com",
        "slow": False,
        "locale": "ru-RU",
    },
]

_BY_ID = {str(v["id"]): v for v in VOICE_CATALOG}
_DEFAULT_VOICE = "ru-male"


def resolve_gtts_voice(voice_id: str | None = None) -> dict[str, str | bool]:
    """Возвращает параметры gTTS для выбранного голоса."""
    raw = (voice_id or settings.GTTS_VOICE or _DEFAULT_VOICE).strip()
    hit = _BY_ID.get(raw)
    if hit:
        return hit
    return _BY_ID[_DEFAULT_VOICE]


def list_assistant_voices() -> dict:
    default = (settings.GTTS_VOICE or _DEFAULT_VOICE).strip()
    if default not in _BY_ID:
        default = _DEFAULT_VOICE
    voices = [
        {
            "id": str(v["id"]),
            "name": str(v["name"]),
            "gender": str(v["gender"]),
            "locale": str(v["locale"]),
            "preview_audio": None,
        }
        for v in VOICE_CATALOG
    ]
    return {
        "default_voice": default,
        "model": "gtts",
        "language": "ru-RU",
        "groups": [
            {
                "id": "gtts",
                "label": "Google Translate TTS",
                "voices": voices,
            }
        ],
    }
