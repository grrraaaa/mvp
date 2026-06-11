"""TTS catalog — Puter.js (client-side). Server synthesis disabled."""
from __future__ import annotations

from services.tts.puter_voices import (
    DEFAULT_LANGUAGE,
    list_assistant_voices,
    tts_status_payload,
)


def configured_providers() -> list[str]:
    return ["puter"]


def resolve_synthesis_route(voice_id: str | None = None) -> tuple[str, str | None]:
    raw = (voice_id or DEFAULT_LANGUAGE).strip()
    return "puter", raw or DEFAULT_LANGUAGE


def list_all_assistant_voices() -> dict:
    return list_assistant_voices()


__all__ = [
    "configured_providers",
    "list_all_assistant_voices",
    "resolve_synthesis_route",
    "tts_status_payload",
]
