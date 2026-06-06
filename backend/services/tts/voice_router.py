"""Маршрутизация озвучки по voice_id между Google Cloud и Deepgram."""
from __future__ import annotations

from core.config import settings
from services.tts.deepgram_voices import DEEPGRAM_VOICE_IDS
from services.tts.google_voices import GOOGLE_VOICE_IDS
from services.tts.deepgram_voices import list_assistant_voices as list_deepgram_voices
from services.tts.google_voices import list_assistant_voices as list_google_voices
from services.tts.gtts_voices import list_assistant_voices as list_gtts_voices


def _google_configured() -> bool:
    return bool(
        settings.GOOGLE_TTS_API_KEY
        or settings.GOOGLE_APPLICATION_CREDENTIALS
        or settings.GOOGLE_SERVICE_ACCOUNT_JSON
    )


def _deepgram_configured() -> bool:
    return bool(settings.DEEPGRAM_API_KEY)


def configured_providers() -> list[str]:
    providers: list[str] = []
    if _google_configured():
        providers.append("google")
    if _deepgram_configured():
        providers.append("deepgram")
    return providers


def resolve_synthesis_route(voice_id: str | None = None) -> tuple[str, str | None]:
    """Возвращает (provider, voice_id) для synthesize."""
    raw = (voice_id or settings.TTS_DEFAULT_VOICE or "").strip()

    if raw in GOOGLE_VOICE_IDS or raw.startswith("ru-RU-"):
        if _google_configured():
            return "google", raw
        if _deepgram_configured():
            return "deepgram", (settings.DEEPGRAM_TTS_VOICE or "arcas").strip()
    if raw in DEEPGRAM_VOICE_IDS or raw.startswith("aura-"):
        if _deepgram_configured():
            return "deepgram", raw
        if _google_configured():
            return "google", (settings.GOOGLE_TTS_VOICE or "ru-RU-Neural2-B").strip()
    if raw == "alexei" and _deepgram_configured():
        return "deepgram", "arcas"

    if _google_configured():
        default = (settings.GOOGLE_TTS_VOICE or "ru-RU-Neural2-B").strip()
        return "google", default
    if _deepgram_configured():
        default = (settings.DEEPGRAM_TTS_VOICE or "arcas").strip()
        return "deepgram", default
    return "gtts", (settings.GTTS_VOICE or "ru-male").strip()


def list_all_assistant_voices() -> dict:
    groups: list[dict] = []
    if _google_configured():
        groups.extend(list_google_voices()["groups"])
    if _deepgram_configured():
        groups.extend(list_deepgram_voices()["groups"])

    if groups:
        default = (settings.TTS_DEFAULT_VOICE or "").strip()
        all_ids = {v["id"] for g in groups for v in g["voices"]}
        if default not in all_ids:
            if _google_configured():
                default = (settings.GOOGLE_TTS_VOICE or "ru-RU-Neural2-B").strip()
            elif _deepgram_configured():
                default = (settings.DEEPGRAM_TTS_VOICE or "arcas").strip()
            else:
                default = groups[0]["voices"][0]["id"]
        return {
            "default_voice": default,
            "model": "multi",
            "language": "ru-RU",
            "groups": groups,
        }

    return list_gtts_voices()


def tts_status_payload() -> dict:
    providers = configured_providers()
    if len(providers) >= 2:
        provider = "multi"
        model = "google+deepgram"
    elif providers:
        provider = providers[0]
        model = "google-cloud-tts" if provider == "google" else "deepgram-aura-2"
    else:
        provider = "gtts"
        model = "gtts"

    route_provider, voice = resolve_synthesis_route(None)
    if providers and route_provider not in providers:
        route_provider, voice = resolve_synthesis_route(voice)

    return {
        "enabled": True,
        "model": model,
        "provider": provider,
        "providers": providers or ["gtts"],
        "language": "ru-RU",
        "voice": voice,
        "voice_selection": True,
    }
