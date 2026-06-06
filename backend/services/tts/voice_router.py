"""Маршрутизация: Qwen TTS (русский) + Edge TTS (fallback без ключа)."""
from __future__ import annotations

from core.config import settings
from services.tts.edge_voices import EDGE_VOICE_IDS, list_assistant_voices as list_edge_voices
from services.tts.qwen_voices import QWEN_VOICE_IDS, list_assistant_voices as list_qwen_voices
from services.tts.gtts_voices import list_assistant_voices as list_gtts_voices


def _qwen_configured() -> bool:
    return bool(settings.QWEN_TTS_API_KEY.strip() and settings.QWEN_TTS_BASE_URL.strip())


def configured_providers() -> list[str]:
    providers = ["edge"]
    if _qwen_configured():
        providers.insert(0, "qwen")
    return providers


def _edge_voice_for_gender(gender: str) -> str:
    if gender == "female":
        return "ru-RU-SvetlanaNeural"
    return "ru-RU-DmitryNeural"


def _qwen_gender(voice_id: str) -> str:
    if voice_id in ("qwen-female", "Serena"):
        return "female"
    return "male"


def resolve_synthesis_route(voice_id: str | None = None) -> tuple[str, str | None]:
    raw = (voice_id or settings.TTS_DEFAULT_VOICE or "").strip()

    if raw in EDGE_VOICE_IDS or (raw.startswith("ru-RU-") and raw.endswith("Neural")):
        return "edge", raw

    if raw in QWEN_VOICE_IDS or raw in ("Alek", "Serena"):
        if _qwen_configured():
            return "qwen", raw
        return "edge", _edge_voice_for_gender(_qwen_gender(raw))

    if _qwen_configured():
        default = (settings.QWEN_TTS_VOICE or "qwen-male").strip()
        return "qwen", default

    default = (settings.EDGE_TTS_VOICE or "ru-RU-DmitryNeural").strip()
    return "edge", default


def list_all_assistant_voices() -> dict:
    groups: list[dict] = []
    groups.extend(list_qwen_voices()["groups"])
    groups.extend(list_edge_voices()["groups"])

    default = (settings.TTS_DEFAULT_VOICE or "").strip()
    all_ids = {v["id"] for g in groups for v in g["voices"]}
    if default not in all_ids:
        if _qwen_configured():
            default = (settings.QWEN_TTS_VOICE or "qwen-male").strip()
        else:
            default = (settings.EDGE_TTS_VOICE or "ru-RU-DmitryNeural").strip()
    if default not in all_ids:
        default = "ru-RU-DmitryNeural"

    return {
        "default_voice": default,
        "model": "qwen+edge" if _qwen_configured() else "edge-tts",
        "language": "ru-RU",
        "groups": groups,
        "qwen_available": _qwen_configured(),
    }


def tts_status_payload() -> dict:
    qwen_ok = _qwen_configured()
    providers = configured_providers()
    provider = "multi" if qwen_ok else "edge"
    _, voice = resolve_synthesis_route(None)

    return {
        "enabled": True,
        "model": "qwen+edge" if qwen_ok else "edge-tts",
        "provider": provider,
        "providers": providers,
        "qwen_available": qwen_ok,
        "language": "ru-RU",
        "voice": voice,
        "voice_selection": True,
    }
