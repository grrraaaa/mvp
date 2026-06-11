"""Маршрутизация: Google Cloud TTS (приоритет №1) → Qwen TTS (русский) → Edge TTS (fallback без ключа)."""
from __future__ import annotations

from core.config import settings
from services.tts.edge_voices import EDGE_VOICE_IDS, list_assistant_voices as list_edge_voices
from services.tts.google_voices import GOOGLE_VOICE_IDS, list_assistant_voices as list_google_voices
from services.tts.qwen_voices import QWEN_VOICE_IDS, list_assistant_voices as list_qwen_voices
from services.tts.gtts_voices import list_assistant_voices as list_gtts_voices


def _google_configured() -> bool:
    return bool(
        settings.GOOGLE_TTS_API_KEY.strip()
        or settings.GOOGLE_APPLICATION_CREDENTIALS.strip()
        or settings.GOOGLE_SERVICE_ACCOUNT_JSON.strip()
    )


def _qwen_configured() -> bool:
    return bool(settings.QWEN_TTS_API_KEY.strip() and settings.QWEN_TTS_BASE_URL.strip())


def configured_providers() -> list[str]:
    """Порядок приоритета: google → qwen → edge (edge всегда доступен)."""
    providers = ["edge"]
    if _qwen_configured():
        providers.insert(0, "qwen")
    if _google_configured():
        providers.insert(0, "google")
    return providers


def _edge_voice_for_gender(gender: str) -> str:
    if gender == "female":
        return "ru-RU-SvetlanaNeural"
    return "ru-RU-DmitryNeural"


def _qwen_gender(voice_id: str) -> str:
    if voice_id in ("qwen-female", "Serena"):
        return "female"
    return "male"


def _google_gender(voice_id: str) -> str:
    """Извлекает пол из id голоса Google (Wavenet/Neural2/Standard A/B/C/D)."""
    low = voice_id.lower()
    if any(tag in low for tag in ("-a", "-c", "female", "woman", "serena")):
        return "female"
    if any(tag in low for tag in ("-b", "-d", "male", "man")):
        return "male"
    return "male"


def resolve_synthesis_route(voice_id: str | None = None) -> tuple[str, str | None]:
    """Возвращает (provider, resolved_voice_id). Голос → провайдер по каталогу."""
    raw = (voice_id or settings.TTS_DEFAULT_VOICE or "").strip()

    # Google: точное совпадение id из каталога или любой ru-RU-*Neural*/Standard*/Wavenet*/Neural2*
    if raw in GOOGLE_VOICE_IDS or (
        raw.startswith("ru-RU-")
        and (
            "Wavenet" in raw
            or "Neural" in raw
            or "Standard" in raw
        )
    ):
        if _google_configured():
            return "google", raw
        # Фоллбек на edge с тем же полом
        return "edge", _edge_voice_for_gender(_google_gender(raw))

    # Edge: ru-RU-*-Neural
    if raw in EDGE_VOICE_IDS or (raw.startswith("ru-RU-") and raw.endswith("Neural")):
        return "edge", raw

    # Qwen
    if raw in QWEN_VOICE_IDS or raw in ("Alek", "Serena"):
        if _qwen_configured():
            return "qwen", raw
        return "edge", _edge_voice_for_gender(_qwen_gender(raw))

    # Неизвестный voice_id: дефолтим по конфигурации (google > qwen > edge)
    if _google_configured():
        default = (settings.GOOGLE_TTS_VOICE or "ru-RU-Wavenet-B").strip()
        return "google", default
    if _qwen_configured():
        default = (settings.QWEN_TTS_VOICE or "qwen-male").strip()
        return "qwen", default
    default = (settings.EDGE_TTS_VOICE or "ru-RU-DmitryNeural").strip()
    return "edge", default


def list_all_assistant_voices() -> dict:
    """Каталог голосов для UI: Google → Qwen → Edge."""
    groups: list[dict] = []
    groups.extend(list_google_voices()["groups"])
    groups.extend(list_qwen_voices()["groups"])
    groups.extend(list_edge_voices()["groups"])

    # Дефолт по полу: если задан TTS_DEFAULT_VOICE — берём его, иначе male.
    default = (settings.TTS_DEFAULT_VOICE or "").strip()
    all_ids = {v["id"] for g in groups for v in g["voices"]}
    if default not in all_ids:
        # Приоритет: google > qwen > edge
        if _google_configured():
            default = (settings.GOOGLE_TTS_VOICE or "ru-RU-Wavenet-B").strip()
        elif _qwen_configured():
            default = (settings.QWEN_TTS_VOICE or "qwen-male").strip()
        else:
            default = (settings.EDGE_TTS_VOICE or "ru-RU-DmitryNeural").strip()
    if default not in all_ids:
        default = "ru-RU-DmitryNeural"

    providers = configured_providers()
    if _google_configured() and _qwen_configured():
        model = "google+qwen+edge"
    elif _google_configured():
        model = "google+edge"
    elif _qwen_configured():
        model = "qwen+edge"
    else:
        model = "edge-tts"

    return {
        "default_voice": default,
        "model": model,
        "language": "ru-RU",
        "groups": groups,
        "providers": providers,
        "google_available": _google_configured(),
        "qwen_available": _qwen_configured(),
    }


def tts_status_payload() -> dict:
    google_ok = _google_configured()
    qwen_ok = _qwen_configured()
    providers = configured_providers()
    provider = "multi" if len(providers) > 1 else providers[0]
    _, voice = resolve_synthesis_route(None)

    if google_ok and qwen_ok:
        model = "google+qwen+edge"
    elif google_ok:
        model = "google+edge"
    elif qwen_ok:
        model = "qwen+edge"
    else:
        model = "edge-tts"

    return {
        "enabled": True,
        "model": model,
        "provider": provider,
        "providers": providers,
        "google_available": google_ok,
        "qwen_available": qwen_ok,
        "language": "ru-RU",
        "voice": voice,
        "voice_selection": True,
    }
