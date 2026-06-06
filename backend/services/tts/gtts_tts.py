"""Google Translate TTS через gTTS (без API-ключа)."""
from __future__ import annotations

import asyncio
import io

from services.tts.edge_tts import synthesize_speech as edge_synthesize
from services.tts.errors import TtsProviderError
from services.tts.gtts_voices import resolve_gtts_voice
from services.tts.text import clean_text_for_tts

# У gTTS один голос на русский; мужской — через Edge TTS (тоже без ключа).
_MALE_EDGE_VOICE = "ru-RU-DmitryNeural"


def _synthesize_sync(text: str, lang: str, tld: str, slow: bool) -> bytes:
    try:
        from gtts import gTTS
    except ImportError as exc:
        raise TtsProviderError(
            "Установите пакет gTTS: pip install gTTS",
            503,
        ) from exc

    buf = io.BytesIO()
    try:
        tts = gTTS(text=text, lang=lang, tld=tld, slow=slow)
        tts.write_to_fp(buf)
    except Exception as exc:
        raise TtsProviderError(f"gTTS: {exc}", 502) from exc

    data = buf.getvalue()
    if not data:
        raise TtsProviderError("Пустой ответ от gTTS", 502)
    return data


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    payload_text = clean_text_for_tts(text)
    if not payload_text:
        raise TtsProviderError("Пустой текст для озвучки", 400)

    voice = resolve_gtts_voice(voice_id)
    gender = str(voice.get("gender", ""))

    if gender == "male":
        try:
            return await edge_synthesize(payload_text, voice_id=_MALE_EDGE_VOICE)
        except TtsProviderError:
            pass

    lang = str(voice.get("lang", "ru"))
    tld = str(voice.get("tld", "com"))
    slow = bool(voice.get("slow", False))

    try:
        return await asyncio.to_thread(
            _synthesize_sync,
            payload_text,
            lang,
            tld,
            slow,
        )
    except TtsProviderError:
        if gender != "male":
            return await edge_synthesize(payload_text, voice_id="ru-RU-SvetlanaNeural")
        raise
