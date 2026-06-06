"""Google Cloud Text-to-Speech for assistant replies."""
from __future__ import annotations

import base64
import json
import os
from typing import Any

import httpx

from core.config import settings
from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.google_voices import google_voice_chain, resolve_google_voice
from services.tts.text import clean_text_for_tts

_SYNTHESIZE_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"


def _google_tts_configured() -> bool:
    return bool(
        settings.GOOGLE_TTS_API_KEY
        or settings.GOOGLE_APPLICATION_CREDENTIALS
        or settings.GOOGLE_SERVICE_ACCOUNT_JSON
    )


def _build_synthesis_payload(text: str, language_code: str, voice_name: str) -> dict[str, Any]:
    return {
        "input": {"text": text},
        "voice": {"languageCode": language_code, "name": voice_name},
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": settings.GOOGLE_TTS_SPEAKING_RATE,
            "pitch": settings.GOOGLE_TTS_PITCH,
        },
    }


async def _synthesize_via_api_key(payload: dict[str, Any]) -> bytes:
    api_key = settings.GOOGLE_TTS_API_KEY.strip()
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            _SYNTHESIZE_URL,
            params={"key": api_key},
            headers={"Content-Type": "application/json"},
            json=payload,
        )

    if response.status_code >= 400:
        raise TtsProviderError(
            (response.text or "Google TTS error").strip(),
            response.status_code,
        )

    data = response.json()
    audio_b64 = data.get("audioContent")
    if not audio_b64:
        raise TtsProviderError("Пустой ответ от Google TTS", 502)

    try:
        return base64.b64decode(audio_b64)
    except Exception as exc:
        raise TtsProviderError("Некорректный audioContent от Google TTS", 502) from exc


def _ensure_service_account_credentials() -> None:
    """Подготавливает GOOGLE_APPLICATION_CREDENTIALS для google-cloud-texttospeech."""
    if settings.GOOGLE_APPLICATION_CREDENTIALS:
        return
    raw = (settings.GOOGLE_SERVICE_ACCOUNT_JSON or "").strip()
    if not raw:
        return
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise TtsNotConfiguredError(
            "GOOGLE_SERVICE_ACCOUNT_JSON должен быть валидным JSON сервисного аккаунта"
        ) from exc
    if not isinstance(parsed, dict):
        raise TtsNotConfiguredError("GOOGLE_SERVICE_ACCOUNT_JSON должен быть JSON-объектом")

    from pathlib import Path
    import tempfile

    tmp = Path(tempfile.gettempdir()) / "google-tts-sa.json"
    tmp.write_text(json.dumps(parsed), encoding="utf-8")
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(tmp)


async def _synthesize_via_client(payload: dict[str, Any]) -> bytes:
    try:
        from google.cloud import texttospeech
    except ImportError as exc:
        raise TtsNotConfiguredError(
            "Установите google-cloud-texttospeech или задайте GOOGLE_TTS_API_KEY"
        ) from exc

    _ensure_service_account_credentials()
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") and not settings.GOOGLE_APPLICATION_CREDENTIALS:
        raise TtsNotConfiguredError(
            "Задайте GOOGLE_APPLICATION_CREDENTIALS или GOOGLE_SERVICE_ACCOUNT_JSON"
        )

    client = texttospeech.TextToSpeechClient()
    voice = payload["voice"]
    audio_cfg = payload["audioConfig"]

    request = texttospeech.SynthesizeSpeechRequest(
        input=texttospeech.SynthesisInput(text=payload["input"]["text"]),
        voice=texttospeech.VoiceSelectionParams(
            language_code=voice["languageCode"],
            name=voice["name"],
        ),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=float(audio_cfg.get("speakingRate", 1.0)),
            pitch=float(audio_cfg.get("pitch", 0.0)),
        ),
    )

    try:
        response = client.synthesize_speech(request=request)
    except Exception as exc:
        raise TtsProviderError(f"Google TTS: {exc}", 502) from exc

    if not response.audio_content:
        raise TtsProviderError("Пустой ответ от Google TTS", 502)
    return bytes(response.audio_content)


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    if not _google_tts_configured():
        raise TtsNotConfiguredError(
            "Задайте GOOGLE_TTS_API_KEY, GOOGLE_APPLICATION_CREDENTIALS "
            "или GOOGLE_SERVICE_ACCOUNT_JSON в .env"
        )

    payload_text = clean_text_for_tts(text)
    if not payload_text:
        raise TtsProviderError("Пустой текст для озвучки", 400)

    chain = google_voice_chain(voice_id)
    last_error: TtsProviderError | None = None

    async def _run(name: str) -> bytes:
        req = _build_synthesis_payload(payload_text, "ru-RU", name)
        if settings.GOOGLE_TTS_API_KEY:
            return await _synthesize_via_api_key(req)
        return await _synthesize_via_client(req)

    for voice_name in chain:
        try:
            return await _run(voice_name)
        except TtsProviderError as exc:
            last_error = exc
            continue

    if last_error:
        raise last_error
    raise TtsProviderError("Google TTS: не удалось синтезировать", 502)
