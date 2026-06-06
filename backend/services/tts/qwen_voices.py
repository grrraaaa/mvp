"""Голоса Qwen / CosyVoice (DashScope) для русского."""
from __future__ import annotations

from core.config import settings

VOICE_CATALOG: list[dict[str, str]] = [
    {
        "id": "qwen-male",
        "name": "Мужской",
        "gender": "male",
        "qwen_voice": "Alek",
        "cosy_voice": "longanyang",
        "locale": "ru-RU",
    },
    {
        "id": "qwen-female",
        "name": "Женский",
        "gender": "female",
        "qwen_voice": "Serena",
        "cosy_voice": "longwan",
        "locale": "ru-RU",
    },
]

QWEN_VOICE_IDS = {v["id"] for v in VOICE_CATALOG}
_BY_ID = {v["id"]: v for v in VOICE_CATALOG}
_DEFAULT_VOICE = "qwen-male"


def resolve_qwen_voice(voice_id: str | None = None) -> dict[str, str]:
    raw = (voice_id or settings.QWEN_TTS_VOICE or _DEFAULT_VOICE).strip()
    if raw in _BY_ID:
        return _BY_ID[raw]
    if raw in ("Alek", "Serena"):
        gender = "female" if raw == "Serena" else "male"
        for v in VOICE_CATALOG:
            if v["gender"] == gender:
                return v
    return _BY_ID[_DEFAULT_VOICE]


def list_assistant_voices() -> dict:
    default = (settings.QWEN_TTS_VOICE or _DEFAULT_VOICE).strip()
    if default not in _BY_ID:
        default = _DEFAULT_VOICE
    voices = [
        {
            "id": v["id"],
            "name": v["name"],
            "gender": v["gender"],
            "locale": v["locale"],
            "preview_audio": None,
        }
        for v in VOICE_CATALOG
    ]
    return {
        "default_voice": default,
        "model": "qwen-tts",
        "language": "ru-RU",
        "groups": [
            {
                "id": "qwen",
                "label": "Qwen (русский)",
                "voices": voices,
            }
        ],
    }
