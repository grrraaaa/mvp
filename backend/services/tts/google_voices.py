"""Русские голоса Google Cloud TTS — полный набор для UI ассистента.

У Google для русского есть 3 семейства голосов:
- Neural2 — самый натуральный, в 4 раза дороже Wavenet (премиум)
- Wavenet  — хорошее качество, средняя цена (дефолт)
- Standard — роботный, дёшево (fallback)
Пол — определяется суффиксом A (female) / B/D (male) / C (female).

Цепочка fallback при синтезе: Neural2 → Wavenet → Standard (см. google_tts.py).
"""
from __future__ import annotations

from core.config import settings

# id в UI → параметры для Google API.
# `tier` используется в UI для бейджей качества и потенциальной монетизации.
VOICE_CATALOG: list[dict[str, str]] = [
    # ── Neural2 (премиум) ────────────────────────────────────────────────
    {
        "id": "ru-RU-Neural2-B",
        "name": "Дмитрий (Neural2)",
        "short": "Дмитрий",
        "gender": "male",
        "google_name": "ru-RU-Neural2-B",
        "language_code": "ru-RU",
        "tier": "neural2",
        "description": "Самый натуральный мужской голос Google",
    },
    {
        "id": "ru-RU-Neural2-D",
        "name": "Михаил (Neural2)",
        "short": "Михаил",
        "gender": "male",
        "google_name": "ru-RU-Neural2-D",
        "language_code": "ru-RU",
        "tier": "neural2",
        "description": "Низкий, спокойный мужской голос",
    },
    {
        "id": "ru-RU-Neural2-A",
        "name": "Алиса (Neural2)",
        "short": "Алиса",
        "gender": "female",
        "google_name": "ru-RU-Neural2-A",
        "language_code": "ru-RU",
        "tier": "neural2",
        "description": "Самый натуральный женский голос Google",
    },
    {
        "id": "ru-RU-Neural2-C",
        "name": "Кира (Neural2)",
        "short": "Кира",
        "gender": "female",
        "google_name": "ru-RU-Neural2-C",
        "language_code": "ru-RU",
        "tier": "neural2",
        "description": "Мягкий, дружелюбный женский голос",
    },
    # ── Wavenet (дефолт) ────────────────────────────────────────────────
    {
        "id": "ru-RU-Wavenet-B",
        "name": "Дмитрий (Wavenet)",
        "short": "Дмитрий",
        "gender": "male",
        "google_name": "ru-RU-Wavenet-B",
        "language_code": "ru-RU",
        "tier": "wavenet",
        "description": "Чёткий мужской голос, хорошее качество",
    },
    {
        "id": "ru-RU-Wavenet-D",
        "name": "Михаил (Wavenet)",
        "short": "Михаил",
        "gender": "male",
        "google_name": "ru-RU-Wavenet-D",
        "language_code": "ru-RU",
        "tier": "wavenet",
        "description": "Уверенный мужской голос",
    },
    {
        "id": "ru-RU-Wavenet-A",
        "name": "Алиса (Wavenet)",
        "short": "Алиса",
        "gender": "female",
        "google_name": "ru-RU-Wavenet-A",
        "language_code": "ru-RU",
        "tier": "wavenet",
        "description": "Чёткий женский голос, хорошее качество",
    },
    {
        "id": "ru-RU-Wavenet-C",
        "name": "Кира (Wavenet)",
        "short": "Кира",
        "gender": "female",
        "google_name": "ru-RU-Wavenet-C",
        "language_code": "ru-RU",
        "tier": "wavenet",
        "description": "Дружелюбный женский голос",
    },
    # ── Standard (бюджет) ───────────────────────────────────────────────
    {
        "id": "ru-RU-Standard-B",
        "name": "Стандарт (мужской)",
        "short": "Стандарт",
        "gender": "male",
        "google_name": "ru-RU-Standard-B",
        "language_code": "ru-RU",
        "tier": "standard",
        "description": "Базовый мужской голос",
    },
    {
        "id": "ru-RU-Standard-A",
        "name": "Стандарт (женский)",
        "short": "Стандарт",
        "gender": "female",
        "google_name": "ru-RU-Standard-A",
        "language_code": "ru-RU",
        "tier": "standard",
        "description": "Базовый женский голос",
    },
]

GOOGLE_VOICE_IDS = {v["id"] for v in VOICE_CATALOG}
_BY_ID = {v["id"]: v for v in VOICE_CATALOG}
_DEFAULT_VOICE = "ru-RU-Wavenet-B"  # мужской, сбалансированный по цене/качеству
_DEFAULT_FEMALE = "ru-RU-Wavenet-A"

# Цепочка fallback при синтезе: Neural2 → Wavenet → Standard.
# Если premium (Neural2) недоступен — пробуем Wavenet, потом Standard.
GOOGLE_SYNTH_FALLBACK_CHAIN: dict[str, list[str]] = {}
for v in VOICE_CATALOG:
    primary = v["google_name"]
    # Определяем пол по суффиксу
    last_char = primary[-1].upper()
    gender_marker = "A" if v["gender"] == "female" else "B"
    same_gender = [other["google_name"] for other in VOICE_CATALOG
                   if other["gender"] == v["gender"]]
    # Приоритет внутри пола: тот же tier → соседний tier (Neural2→Wavenet→Standard)
    same_tier = [n for n in same_gender if n == primary]
    other_tiers = [n for n in same_gender if n != primary]
    GOOGLE_SYNTH_FALLBACK_CHAIN[primary] = same_tier + other_tiers


def resolve_google_voice(voice_id: str | None = None) -> tuple[str, str]:
    """Возвращает (language_code, google_voice_name) для API."""
    raw = (voice_id or settings.GOOGLE_TTS_VOICE or _DEFAULT_VOICE).strip()
    hit = _BY_ID.get(raw)
    if hit:
        return hit["language_code"], hit["google_name"]
    if raw.startswith("ru-RU-"):
        return "ru-RU", raw
    fallback = _BY_ID[_DEFAULT_VOICE]
    return fallback["language_code"], fallback["google_name"]


def google_voice_chain(voice_id: str | None = None) -> list[str]:
    """Имена голосов Google для перебора при ошибке API (Neural2 → Wavenet → Standard)."""
    _, primary = resolve_google_voice(voice_id)
    chain = GOOGLE_SYNTH_FALLBACK_CHAIN.get(primary)
    if chain:
        return chain
    return [primary]


def pick_google_default_voice(gender: str) -> str:
    """Возвращает id дефолтного голоса Google по полу (для автоподбора)."""
    if gender == "female":
        return _DEFAULT_FEMALE
    return _DEFAULT_VOICE


def list_assistant_voices() -> dict:
    default = (settings.GOOGLE_TTS_VOICE or _DEFAULT_VOICE).strip()
    if default not in _BY_ID:
        default = _DEFAULT_VOICE
    voices = [
        {
            "id": v["id"],
            "name": v["name"],
            "short": v.get("short"),
            "gender": v["gender"],
            "locale": v["language_code"],
            "tier": v.get("tier", "wavenet"),
            "description": v.get("description"),
            "preview_audio": None,
        }
        for v in VOICE_CATALOG
    ]
    return {
        "default_voice": default,
        "model": "google-cloud-tts",
        "language": "ru-RU",
        "groups": [
            {
                "id": "google",
                "label": "Google Cloud TTS",
                "voices": voices,
            }
        ],
    }
