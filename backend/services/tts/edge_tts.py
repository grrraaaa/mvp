"""Microsoft Edge Read Aloud TTS via edge-tts (без API-ключа)."""
from __future__ import annotations

from services.tts.edge_voices import resolve_edge_voice
from services.tts.errors import TtsProviderError
from services.tts.text import clean_text_for_tts


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    try:
        import edge_tts
    except ImportError as exc:
        raise TtsProviderError(
            "Установите пакет edge-tts: pip install edge-tts",
            503,
        ) from exc

    payload_text = clean_text_for_tts(text)
    if not payload_text:
        raise TtsProviderError("Пустой текст для озвучки", 400)

    voice = resolve_edge_voice(voice_id)
    fallback = resolve_edge_voice(None)

    async def _run(selected_voice: str) -> bytes:
        communicate = edge_tts.Communicate(payload_text, selected_voice)
        chunks: list[bytes] = []
        try:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    chunks.append(chunk["data"])
        except Exception as exc:
            raise TtsProviderError(f"Edge TTS: {exc}", 502) from exc

        if not chunks:
            raise TtsProviderError("Пустой ответ от Edge TTS", 502)
        return b"".join(chunks)

    try:
        return await _run(voice)
    except TtsProviderError:
        if voice != fallback:
            return await _run(fallback)
        raise
