"""TTS — Puter.js в браузере; серверный синтез отключён."""
from __future__ import annotations

from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.text import clean_text_for_tts
from services.tts.voice_router import (
    configured_providers,
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
    "list_all_assistant_voices",
    "synthesize_speech",
    "tts_status_payload",
]


def get_tts_provider() -> str:
    return "puter"


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    """Серверный TTS отключён — озвучка через Puter.js на клиенте."""
    raise TtsNotConfiguredError(
        "Озвучка выполняется в браузере через Puter.js (puter.ai.txt2speech). "
        "Серверный синтез отключён."
    )
