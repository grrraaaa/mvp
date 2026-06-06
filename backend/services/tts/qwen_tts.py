"""Qwen / CosyVoice TTS через Alibaba Model Studio (DashScope API)."""
from __future__ import annotations

import base64

import httpx

from core.config import settings
from services.tts.errors import TtsNotConfiguredError, TtsProviderError
from services.tts.qwen_voices import resolve_qwen_voice
from services.tts.text import clean_text_for_tts

_MULTIMODAL_PATH = "/services/aigc/multimodal-generation/generation"
_SPEECH_PATH = "/services/audio/tts/SpeechSynthesizer"


def _configured() -> bool:
    return bool(settings.QWEN_TTS_API_KEY.strip())


def _base_url() -> str:
    raw = (settings.QWEN_TTS_BASE_URL or "").strip().rstrip("/")
    if not raw:
        raise TtsNotConfiguredError("Задайте QWEN_TTS_BASE_URL в .env")
    return raw


def _models_to_try() -> list[str]:
    raw = (settings.QWEN_TTS_MODEL or "").strip()
    if raw:
        return [m.strip() for m in raw.split(",") if m.strip()]
    return ["qwen3-tts-flash", "cosyvoice-v3-flash", "cosyvoice-v3.5-flash"]


async def _download_audio(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as client:
        resp = await client.get(url)
    if resp.status_code >= 400 or not resp.content:
        raise TtsProviderError(f"Не удалось скачать аудио: HTTP {resp.status_code}", resp.status_code)
    return resp.content


def _extract_audio_bytes(data: dict) -> bytes:
    output = data.get("output") or {}
    audio = output.get("audio") or {}
    if audio.get("data"):
        try:
            return base64.b64decode(audio["data"])
        except Exception as exc:
            raise TtsProviderError("Некорректный audio.data от Qwen TTS", 502) from exc
    if audio.get("url"):
        raise TtsProviderError("AUDIO_URL", 200)  # signal: need download
    raise TtsProviderError("Пустой ответ от Qwen TTS", 502)


async def _post_json(path: str, payload: dict) -> dict:
    url = f"{_base_url()}{path}"
    headers = {
        "Authorization": f"Bearer {settings.QWEN_TTS_API_KEY.strip()}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
    try:
        data = resp.json()
    except Exception:
        data = {}
    if resp.status_code >= 400:
        msg = (data.get("message") or data.get("code") or resp.text or "Qwen TTS error").strip()
        raise TtsProviderError(f"Qwen TTS: {msg}", resp.status_code)
    if data.get("code"):
        raise TtsProviderError(f"Qwen TTS: {data.get('message') or data.get('code')}", 502)
    return data


async def _synthesize_multimodal(text: str, model: str, voice_meta: dict[str, str]) -> bytes:
    payload = {
        "model": model,
        "input": {
            "text": text,
            "voice": voice_meta["qwen_voice"],
            "language_type": "Russian",
        },
    }
    data = await _post_json(_MULTIMODAL_PATH, payload)
    try:
        return _extract_audio_bytes(data)
    except TtsProviderError as exc:
        if str(exc) == "AUDIO_URL":
            url = (data.get("output") or {}).get("audio", {}).get("url")
            if url:
                return await _download_audio(url)
        raise


async def _synthesize_cosyvoice(text: str, model: str, voice_meta: dict[str, str]) -> bytes:
    payload = {
        "model": model,
        "input": {
            "text": text,
            "voice": voice_meta["cosy_voice"],
            "format": "mp3",
            "sample_rate": 24000,
        },
    }
    data = await _post_json(_SPEECH_PATH, payload)
    output = data.get("output") or data
    if isinstance(output, dict) and output.get("audio"):
        audio = output["audio"]
        if isinstance(audio, dict):
            if audio.get("data"):
                return base64.b64decode(audio["data"])
            if audio.get("url"):
                return await _download_audio(audio["url"])
        if isinstance(audio, str):
            return base64.b64decode(audio)
    try:
        return _extract_audio_bytes(data)
    except TtsProviderError as exc:
        if str(exc) == "AUDIO_URL":
            url = (data.get("output") or {}).get("audio", {}).get("url")
            if url:
                return await _download_audio(url)
        raise


async def synthesize_speech(text: str, voice_id: str | None = None) -> bytes:
    if not _configured():
        raise TtsNotConfiguredError("Задайте QWEN_TTS_API_KEY в .env")

    payload_text = clean_text_for_tts(text)
    if not payload_text:
        raise TtsProviderError("Пустой текст для озвучки", 400)

    voice_meta = resolve_qwen_voice(voice_id)
    last_error: TtsProviderError | None = None

    for model in _models_to_try():
        try:
            if model.startswith("cosyvoice"):
                return await _synthesize_cosyvoice(payload_text, model, voice_meta)
            return await _synthesize_multimodal(payload_text, model, voice_meta)
        except TtsProviderError as exc:
            last_error = exc
            if "Model not exist" in str(exc) or "model not exist" in str(exc).lower():
                continue
            raise

    if last_error:
        raise TtsProviderError(
            f"{last_error}. В Model Studio (Frankfurt) включите модель "
            "qwen3-tts-flash или cosyvoice-v3-flash в разделе Models.",
            503,
        ) from last_error
    raise TtsProviderError("Qwen TTS: нет доступных моделей", 503)
