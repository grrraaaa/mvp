"""Русские голоса Google Cloud TTS (Neural2 — лучшее качество для ru-RU)."""
from __future__ import annotations

from core.config import settings

VOICE_CATALOG: list[dict[str, str]] = [
    {
        "id": "ru-RU-Neural2-B",
        "name": "Мужской",
        "gender": "male",
        "google_name": "ru-RU-Neural2-B",
        "language_code": "ru-RU",
    },
    {
        "id": "ru-RU-Neural2-A",
        "name": "Женский",
        "gender": "female",
        "google_name": "ru-RU-Neural2-A",
        "language_code": "ru-RU",
    },
    {
        "id": "ru-RU-Wavenet-B",
        "name": "Мужской (Wavenet)",
        "gender": "male",
        "google_name": "ru-RU-Wavenet-B",
        "language_code": "ru-RU",
    },
    {
        "id": "ru-RU-Wavenet-A",
        "name": "Женский (Wavenet)",
        "gender": "female",
        "google_name": "ru-RU-Wavenet-A",
        "language_code": "ru-RU",
    },
]

GOOGLE_VOICE_IDS = {v["id"] for v in VOICE_CATALOG}
_BY_ID = {v["id"]: v for v in VOICE_CATALOG}
_DEFAULT_VOICE = "ru-RU-Neural2-B"


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
                "label": "Google",
                "voices": voices,
            }
        ],
    }
