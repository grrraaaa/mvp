"""Каталог русских голосов Microsoft Edge TTS (edge-tts) для UI ассистента."""
from __future__ import annotations

from core.config import settings

# id в UI → ShortName голоса Edge (Neural)
VOICE_CATALOG: list[dict[str, str]] = [
    {
        "id": "ru-RU-DmitryNeural",
        "name": "Мужской",
        "gender": "male",
        "edge_name": "ru-RU-DmitryNeural",
        "locale": "ru-RU",
    },
    {
        "id": "ru-RU-SvetlanaNeural",
        "name": "Женский",
        "gender": "female",
        "edge_name": "ru-RU-SvetlanaNeural",
        "locale": "ru-RU",
    },
]

_BY_ID = {v["id"]: v for v in VOICE_CATALOG}
_DEFAULT_VOICE = "ru-RU-DmitryNeural"


def resolve_edge_voice(voice_id: str | None = None) -> str:
    """Возвращает ShortName голоса Edge для edge-tts."""
    raw = (voice_id or settings.EDGE_TTS_VOICE or _DEFAULT_VOICE).strip()
    hit = _BY_ID.get(raw)
    if hit:
        return hit["edge_name"]
    if raw.endswith("Neural") and raw.startswith("ru-RU-"):
        return raw
    return _BY_ID[_DEFAULT_VOICE]["edge_name"]


def list_assistant_voices() -> dict:
    default = (settings.EDGE_TTS_VOICE or _DEFAULT_VOICE).strip()
    if default not in _BY_ID and not (
        default.endswith("Neural") and default.startswith("ru-RU-")
    ):
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
        "model": "edge-tts",
        "language": "ru-RU",
        "groups": [
            {
                "id": "edge",
                "label": "Microsoft Edge TTS",
                "voices": voices,
            }
        ],
    }
