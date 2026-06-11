"""TTS — Google Cloud TTS (приоритет) → Qwen (DashScope) → Edge TTS (fallback)."""
from __future__ import annotations

from services.tts.edge_tts import synthesize_speech as edge_synthesize
from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.google_tts import synthesize_speech as google_synthesize
from services.tts.qwen_tts import synthesize_speech as qwen_synthesize
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
    return "multi" if len(providers) > 1 else providers[0]


def _edge_fallback_from_google(google_voice_id: str | None) -> str:
    """Edge-аналог для Google-голоса, если Google упал."""
    low = (google_voice_id or "").lower()
    if any(tag in low for tag in ("-a", "-c", "female", "woman")):
        return "ru-RU-SvetlanaNeural"
    return "ru-RU-DmitryNeural"


def _edge_fallback_from_qwen(qwen_voice_id: str | None) -> str:
    if qwen_voice_id in ("qwen-female", "Serena"):
        return "ru-RU-SvetlanaNeural"
    return "ru-RU-DmitryNeural"


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    """Цепочка: Google → Qwen → Edge. Каждый шаг — try/except с фоллбеком."""
    provider, resolved_voice = resolve_synthesis_route(voice_id)
    last_error: Exception | None = None

    if provider == "google":
        try:
            return await google_synthesize(text, voice_id=resolved_voice)
        except (TtsProviderError, TtsNotConfiguredError) as exc:
            last_error = exc
            # Падаем в qwen, если он сконфигурён
            if "qwen" in configured_providers():
                try:
                    return await qwen_synthesize(text, voice_id=None)
                except (TtsProviderError, TtsNotConfiguredError) as exc2:
                    last_error = exc2
            return await edge_synthesize(
                text, voice_id=_edge_fallback_from_google(resolved_voice)
            )

    if provider == "qwen":
        try:
            return await qwen_synthesize(text, voice_id=resolved_voice)
        except (TtsProviderError, TtsNotConfiguredError) as exc:
            last_error = exc
            return await edge_synthesize(
                text, voice_id=_edge_fallback_from_qwen(resolved_voice)
            )

    # provider == "edge" или прямой фоллбек
    return await edge_synthesize(text, voice_id=resolved_voice)
