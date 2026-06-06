"""Response enrichment: emotion hints, sentiment for 3D character."""
from __future__ import annotations

import re
from typing import Any


def detect_response_tone(message: str, response: dict[str, Any]) -> str:
    """success | warning | error | neutral | info"""
    low = message.lower()
    if re.search(r"ошибк|не\s+удал|неверн|отклон|превыш", low):
        return "error"
    if response.get("form_fill_status") == "complete":
        return "success"
    severity = response.get("severity")
    if severity in ("critical", "warn"):
        return "warning"
    sources = response.get("sources") or []
    charts = response.get("charts") or []
    if charts or "остаток" in low or "найден" in low:
        return "info"
    if re.search(r"готов|создан|подключ|импорт|провед", low):
        return "success"
    if re.search(r"подпис|ожида|просроч|лимит|риск", low):
        return "warning"
    return "neutral"


def emotion_for_tone(tone: str) -> str:
    return {
        "success": "smile",
        "warning": "concern",
        "error": "apologetic",
        "info": "explain",
        "neutral": "idle",
    }.get(tone, "idle")
