"""TTS — Inworld (server stream) + Puter.js (browser)."""
from __future__ import annotations

from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.inworld_tts import synthesize_inworld_speech
from services.tts.text import clean_text_for_tts
from services.tts.voice_router import (
    configured_providers,
    is_inworld_voice,
    list_all_assistant_voices,
    resolve_synthesis_route,
    tts_status_payload,
)

__all__ = [
    "TtsNotConfiguredError",
    "TtsProviderError",
    "clean_text_for_tts",
    "configured_providers",
    "get_tts_provider",
    "is_inworld_voice",
    "list_all_assistant_voices",
    "synthesize_speech",
    "tts_status_payload",
]


def get_tts_provider() -> str:
    providers = configured_providers()
    return "multi" if len(providers) > 1 else (providers[0] if providers else "puter")


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    provider, resolved = resolve_synthesis_route(voice_id)
    if provider == "inworld" and resolved:
        return await synthesize_inworld_speech(text, resolved)
    raise TtsNotConfiguredError(
        "Для этого голоса используется Puter.js в браузере. "
        "Выберите голос Inworld AI для серверной озвучки."
    )
