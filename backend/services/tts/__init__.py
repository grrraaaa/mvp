"""TTS — Google Cloud + Deepgram (выбор в UI), gTTS/Edge как fallback без ключей."""
from __future__ import annotations

from services.tts.deepgram import synthesize_speech as deepgram_synthesize
from services.tts.edge_tts import synthesize_speech as edge_synthesize
from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.google_tts import synthesize_speech as google_synthesize
from services.tts.gtts_tts import synthesize_speech as gtts_synthesize
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
    providers = configured_providers()
    if len(providers) >= 2:
        return "multi"
    if providers:
        return providers[0]
    return "gtts"


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    provider, resolved_voice = resolve_synthesis_route(voice_id)
    if provider == "google":
        return await google_synthesize(text, voice_id=resolved_voice)
    if provider == "deepgram":
        return await deepgram_synthesize(text, voice_id=resolved_voice)
    if provider == "gtts":
        return await gtts_synthesize(text, voice_id=resolved_voice)
    return await edge_synthesize(text, voice_id=resolved_voice)
