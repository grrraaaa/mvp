"""Text-to-speech for assistant replies (Deepgram Aura only)."""
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
from services.tts.deepgram_voices import list_assistant_voices

router = APIRouter()


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    voice_id: str | None = Field(default=None, max_length=128)


@router.get("/status")
async def tts_status():
    provider = get_tts_provider()
    voice = (settings.DEEPGRAM_TTS_VOICE or "alexei").strip() if provider else None
    return {
        "enabled": provider is not None,
        "model": settings.DEEPGRAM_TTS_MODEL if provider else "",
        "provider": provider,
        "language": "multilingual",
        "voice": voice,
        "voice_selection": provider == "deepgram",
    }


@router.get("/voices")
async def tts_voices():
    if get_tts_provider() != "deepgram":
        raise HTTPException(
            status_code=503,
            detail="Задайте DEEPGRAM_API_KEY в .env",
        )
    return list_assistant_voices()


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
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )
