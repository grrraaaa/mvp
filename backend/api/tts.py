"""Text-to-speech for assistant replies (Speechify / Soniox / Deepgram)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from core.config import settings
from services.tts import (
    TtsNotConfiguredError,
    TtsProviderError,
    clean_text_for_tts,
    get_tts_provider,
    synthesize_speech,
)
from services.tts.speechify_voices import list_assistant_voices

router = APIRouter()

_AUDIO_MEDIA = {
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "aac": "audio/aac",
    "opus": "audio/opus",
    "flac": "audio/flac",
}


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    voice_id: str | None = Field(default=None, max_length=128)


def _response_media_type() -> str:
    provider = get_tts_provider()
    if provider == "speechify":
        fmt = (settings.SPEECHIFY_TTS_AUDIO_FORMAT or "mp3").lower()
        return _AUDIO_MEDIA.get(fmt, "audio/mpeg")
    if provider == "soniox":
        fmt = (settings.SONIOX_TTS_AUDIO_FORMAT or "mp3").lower()
        return _AUDIO_MEDIA.get(fmt, "audio/mpeg")
    return "audio/mpeg"


@router.get("/status")
async def tts_status():
    provider = get_tts_provider()
    if provider == "speechify":
        model = settings.SPEECHIFY_TTS_MODEL
        language = settings.SPEECHIFY_TTS_LANGUAGE or "ru-RU"
        voice = settings.SPEECHIFY_TTS_VOICE
    elif provider == "soniox":
        model = settings.SONIOX_TTS_MODEL
        language = settings.SONIOX_TTS_LANGUAGE or "auto"
        voice = settings.SONIOX_TTS_VOICE
    elif provider == "deepgram":
        model = settings.DEEPGRAM_TTS_MODEL
        language = "en"
        voice = None
    else:
        model = ""
        language = ""
        voice = None

    return {
        "enabled": provider is not None,
        "model": model,
        "provider": provider,
        "language": language,
        "voice": voice,
        "voice_selection": provider == "speechify",
    }


@router.get("/voices")
async def tts_voices():
    if get_tts_provider() != "speechify":
        raise HTTPException(
            status_code=404,
            detail="Выбор голоса доступен только с Speechify (SPEECHIFY_API_KEY)",
        )
    try:
        return await list_assistant_voices()
    except TtsNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except TtsProviderError as exc:
        status = exc.status_code if exc.status_code and 400 <= exc.status_code < 600 else 502
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@router.post("/speak")
async def speak(request: SpeakRequest):
    cleaned = clean_text_for_tts(request.text)
    if not cleaned:
        raise HTTPException(status_code=400, detail="Нет текста для озвучки")

    try:
        voice_id = (request.voice_id or "").strip() or None
        audio = await synthesize_speech(cleaned, voice_id=voice_id)
    except TtsNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except TtsProviderError as exc:
        status = exc.status_code if exc.status_code and 400 <= exc.status_code < 600 else 502
        raise HTTPException(status_code=status, detail=str(exc)) from exc

    return Response(
        content=audio,
        media_type=_response_media_type(),
        headers={"Cache-Control": "no-store"},
    )
