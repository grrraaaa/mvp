"""TTS routing: Inworld (server) + Puter.js (browser)."""
from __future__ import annotations

from core.config import settings
from services.tts.inworld_voices import (
    _inworld_configured,
    default_inworld_voice,
    inworld_voice_entries,
)
INWORLD_VOICE_IDS: set[str] = set()


def _refresh_inworld_ids() -> None:
    global INWORLD_VOICE_IDS
    INWORLD_VOICE_IDS = {v["id"] for v in inworld_voice_entries()}


def configured_providers() -> list[str]:
    if _inworld_configured():
        return ["inworld"]
    return []


def is_inworld_voice(voice_id: str | None) -> bool:
    _refresh_inworld_ids()
    raw = (voice_id or "").strip()
    return bool(raw and raw in INWORLD_VOICE_IDS)


def resolve_synthesis_route(voice_id: str | None = None) -> tuple[str, str | None]:
    raw = (voice_id or "").strip()
    if is_inworld_voice(raw):
        return "inworld", raw
    if _inworld_configured():
        default = default_inworld_voice()
        if default:
            return "inworld", default
    return "inworld", raw or None


def list_all_assistant_voices() -> dict:
    _refresh_inworld_ids()
    groups: list[dict] = []

    inworld_voices = inworld_voice_entries()
    if inworld_voices:
        groups.append(
            {
                "id": "inworld",
                "label": "Голос",
                "voices": inworld_voices,
            }
        )

    default = default_inworld_voice() or ""
    all_ids = {v["id"] for g in groups for v in g["voices"]}
    if default not in all_ids and groups and groups[0]["voices"]:
        default = groups[0]["voices"][0]["id"]

    providers = configured_providers()
    model = "inworld-tts-2" if _inworld_configured() else "none"

    return {
        "default_voice": default,
        "model": model,
        "language": "auto",
        "groups": groups,
        "providers": providers,
        "inworld_available": _inworld_configured(),
        "puter_available": False,
    }


def tts_status_payload() -> dict:
    _refresh_inworld_ids()
    providers = configured_providers()
    _, voice = resolve_synthesis_route(None)
    catalog = list_all_assistant_voices()

    return {
        "enabled": True,
        "model": catalog["model"],
        "provider": providers[0] if providers else None,
        "providers": providers,
        "inworld_available": _inworld_configured(),
        "puter_available": False,
        "language": "auto",
        "voice": voice,
        "voice_selection": False,
    }
