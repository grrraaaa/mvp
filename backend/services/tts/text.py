"""Shared text cleanup for TTS providers."""
from __future__ import annotations

import re


def clean_text_for_tts(text: str, max_len: int = 2500) -> str:
    """Plain speech-friendly text from assistant markdown-ish replies."""
    t = text.strip()
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"[*_#>`]+", "", t)
    t = re.sub(r"\n{2,}", ". ", t)
    t = re.sub(r"\n", " ", t)
    t = re.sub(r"\s{2,}", " ", t).strip()
    if len(t) > max_len:
        t = t[: max_len - 1].rstrip() + "…"
    return t


def detect_tts_language(text: str, default: str = "ru") -> str:
    """Pick ISO language code from script mix (Soniox supports ru/en/…)."""
    cyr = len(re.findall(r"[\u0400-\u04FF]", text))
    lat = len(re.findall(r"[a-zA-Z]", text))
    if cyr > lat and cyr > 0:
        return "ru"
    if lat > 0:
        return "en"
    return default
