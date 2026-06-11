"""Голоса Qwen TTS (DashScope) и CosyVoice (Alibaba) для русского.

DashScope поддерживает два бэкенда:
- qwen3-tts-flash — Qwen TTS (натуральный, мультиязычный)
- cosyvoice-v3-flash / cosyvoice-v3.5-flash — CosyVoice (китайская студия, отличный русский)
"""
from __future__ import annotations

from core.config import settings

# id в UI → параметры для DashScope API.
# `tier` помогает UI отсортировать и подсветить премиум-варианты.
VOICE_CATALOG: list[dict[str, str]] = [
    # ── Qwen TTS (премиум) ─────────────────────────────────────────────
    {
        "id": "qwen-male",
        "name": "Алексей (Qwen)",
        "short": "Алексей",
        "gender": "male",
        "qwen_voice": "Alek",
        "cosy_voice": "longanyang",
        "locale": "ru-RU",
        "tier": "qwen",
        "description": "Уверенный мужской голос, новейшая модель",
    },
    {
        "id": "qwen-female",
        "name": "Светлана (Qwen)",
        "short": "Светлана",
        "gender": "female",
        "qwen_voice": "Serena",
        "cosy_voice": "longwan",
        "locale": "ru-RU",
        "tier": "qwen",
        "description": "Мягкий женский голос, новейшая модель",
    },
    # ── CosyVoice (мужские) ────────────────────────────────────────────
    {
        "id": "qwen-cosy-longanyang",
        "name": "Лунъян (CosyVoice)",
        "short": "Лунъян",
        "gender": "male",
        "qwen_voice": "Alek",
        "cosy_voice": "longanyang",
        "locale": "ru-RU",
        "tier": "cosyvoice",
        "description": "Низкий, спокойный мужской голос (китайский студийный)",
    },
    {
        "id": "qwen-cosy-longhua",
        "name": "Лунхуа (CosyVoice)",
        "short": "Лунхуа",
        "gender": "male",
        "qwen_voice": "Alek",
        "cosy_voice": "longhua",
        "locale": "ru-RU",
        "tier": "cosyvoice",
        "description": "Тёплый мужской голос",
    },
    {
        "id": "qwen-cosy-longshu",
        "name": "Луншу (CosyVoice)",
        "short": "Луншу",
        "gender": "male",
        "qwen_voice": "Alek",
        "cosy_voice": "longshu",
        "locale": "ru-RU",
        "tier": "cosyvoice",
        "description": "Деловой мужской голос",
    },
    # ── CosyVoice (женские) ────────────────────────────────────────────
    {
        "id": "qwen-cosy-longwan",
        "name": "Лунвань (CosyVoice)",
        "short": "Лунвань",
        "gender": "female",
        "qwen_voice": "Serena",
        "cosy_voice": "longwan",
        "locale": "ru-RU",
        "tier": "cosyvoice",
        "description": "Тонкий женский голос (китайский студийный)",
    },
    {
        "id": "qwen-cosy-longxiaocheng",
        "name": "Лунсяочэн (CosyVoice)",
        "short": "Лунсяочэн",
        "gender": "female",
        "qwen_voice": "Serena",
        "cosy_voice": "longxiaocheng",
        "locale": "ru-RU",
        "tier": "cosyvoice",
        "description": "Молодой женский голос",
    },
]

QWEN_VOICE_IDS = {v["id"] for v in VOICE_CATALOG}
_BY_ID = {v["id"]: v for v in VOICE_CATALOG}
_DEFAULT_VOICE = "qwen-male"
_DEFAULT_FEMALE = "qwen-female"


def resolve_qwen_voice(voice_id: str | None = None) -> dict[str, str]:
    """Возвращает метаданные голоса Qwen/CosyVoice для API."""
    raw = (voice_id or settings.QWEN_TTS_VOICE or _DEFAULT_VOICE).strip()
    hit = _BY_ID.get(raw)
    if hit:
        return hit
    # Старые короткие id: Alek / Serena
    if raw == "Alek":
        for v in VOICE_CATALOG:
            if v["gender"] == "male":
                return v
    if raw == "Serena":
        for v in VOICE_CATALOG:
            if v["gender"] == "female":
                return v
    return _BY_ID[_DEFAULT_VOICE]


def pick_qwen_default_voice(gender: str) -> str:
    if gender == "female":
        return _DEFAULT_FEMALE
    return _DEFAULT_VOICE


def list_assistant_voices() -> dict:
    default = (settings.QWEN_TTS_VOICE or _DEFAULT_VOICE).strip()
    if default not in _BY_ID:
        default = _DEFAULT_VOICE
    voices = [
        {
            "id": v["id"],
            "name": v["name"],
            "short": v.get("short"),
            "gender": v["gender"],
            "locale": v["locale"],
            "tier": v.get("tier", "qwen"),
            "description": v.get("description"),
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
                "label": "Qwen / CosyVoice",
                "voices": voices,
            }
        ],
    }
