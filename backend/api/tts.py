"""Text-to-speech for assistant replies (Google + Deepgram, выбор голоса в UI)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from services.tts import (
    TtsNotConfiguredError,
    TtsProviderError,
    clean_text_for_tts,
    list_all_assistant_voices,
    synthesize_speech,
    tts_status_payload,
)

router = APIRouter()


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    voice_id: str | None = Field(default=None, max_length=128)


@router.get("/status")
async def tts_status():
    return tts_status_payload()


@router.get("/voices")
async def tts_voices():
    return list_all_assistant_voices()


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
