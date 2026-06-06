"""Русские голоса Google Cloud TTS."""
from __future__ import annotations

from core.config import settings

# Wavenet — стабильнее на API key; Neural2 пробуем в google_tts как upgrade.
VOICE_CATALOG: list[dict[str, str]] = [
    {
        "id": "ru-RU-Wavenet-B",
        "name": "Мужской",
        "gender": "male",
        "google_name": "ru-RU-Wavenet-B",
        "language_code": "ru-RU",
    },
    {
        "id": "ru-RU-Wavenet-A",
        "name": "Женский",
        "gender": "female",
        "google_name": "ru-RU-Wavenet-A",
        "language_code": "ru-RU",
    },
]

GOOGLE_VOICE_IDS = {v["id"] for v in VOICE_CATALOG}
_BY_ID = {v["id"]: v for v in VOICE_CATALOG}
_DEFAULT_VOICE = "ru-RU-Wavenet-B"

# Цепочка fallback при синтезе (Neural2 → Wavenet → Standard)
GOOGLE_SYNTH_FALLBACK_CHAIN: dict[str, list[str]] = {
    "ru-RU-Wavenet-B": ["ru-RU-Neural2-B", "ru-RU-Wavenet-B", "ru-RU-Standard-B"],
    "ru-RU-Wavenet-A": ["ru-RU-Neural2-A", "ru-RU-Wavenet-A", "ru-RU-Standard-A"],
}


def resolve_google_voice(voice_id: str | None = None) -> tuple[str, str]:
    """Возвращает (language_code, google_voice_name) для API."""
    raw = (voice_id or settings.GOOGLE_TTS_VOICE or _DEFAULT_VOICE).strip()
    hit = _BY_ID.get(raw)
    if hit:
        return hit["language_code"], hit["google_name"]
    if raw.startswith("ru-RU-"):
        return "ru-RU", raw
    fallback = _BY_ID[_DEFAULT_VOICE]
    return fallback["language_code"], fallback["google_name"]


def google_voice_chain(voice_id: str | None = None) -> list[str]:
    """Имена голосов Google для перебора при ошибке API."""
    _, primary = resolve_google_voice(voice_id)
    chain = GOOGLE_SYNTH_FALLBACK_CHAIN.get(primary)
    if chain:
        return chain
    return [primary]


def list_assistant_voices() -> dict:
    default = (settings.GOOGLE_TTS_VOICE or _DEFAULT_VOICE).strip()
    if default not in _BY_ID and not default.startswith("ru-RU-"):
        default = _DEFAULT_VOICE
    voices = [
        {
            "id": v["id"],
            "name": v["name"],
            "gender": v["gender"],
            "locale": "ru-RU",
            "preview_audio": None,
        }
        for v in VOICE_CATALOG
    ]
    return {
        "default_voice": default,
        "model": "google-cloud-tts",
        "language": "ru-RU",
        "groups": [
            {
                "id": "google",
                "label": "Google (русский)",
                "voices": voices,
            }
        ],
    }
