"""Разбиение составных фраз для заполнения платёжной формы."""
from __future__ import annotations

import re

# Значение поля обрывается перед следующим именованным полем.
FIELD_VALUE_BOUNDARY = (
    r"(?=\s*,\s*|\s+(?:назначени|получател|контрагент|номер|дата|очеред|сумм|"
    r"со\s+сч[её]т|с\s+сч[её]т|сч[её]т\s+получател|сч[её]т\s+плательщик|iban)|$)"
)

_SEGMENT_MARKER_PATTERNS: tuple[str, ...] = (
    r"\bсо\s+сч[её]т\w*\b",
    r"\bсч[её]т\s+получател\w*\b",
    r"\biban\b",
    r"\bназначени\w*",
    r"\bномер\w*\s+документ\w*\b",
    r"\bдокумент\w*\s+номер\w*\b",
    r"\bдата\s+документ\w*\b",
    r"\bдата\b(?=\s*\d)",
    r"\bочередност\w*\b",
    r"\bсумм\w*\b",
    r"\bконтрагент\w*\b",
    r"\bполучател\w*\b",
)


def split_form_fill_message(message: str) -> list[str]:
    """«контрагент Федя сумма 5.000 …» → отдельные куски по полям."""
    text = (message or "").strip()
    if not text:
        return []

    comma_parts = [p.strip() for p in re.split(r"[,;\n]+", text) if p.strip()]
    if len(comma_parts) > 1:
        return comma_parts

    hits: list[tuple[int, int]] = []
    for pat in _SEGMENT_MARKER_PATTERNS:
        for m in re.finditer(pat, text, re.I):
            hits.append((m.start(), m.end()))

    if not hits:
        return [text]

    hits.sort(key=lambda x: x[0])
    merged: list[tuple[int, int]] = []
    for start, end in hits:
        if merged and start < merged[-1][1]:
            continue
        merged.append((start, end))

    if len(merged) <= 1:
        return [text]

    parts: list[str] = []
    for i, (start, _) in enumerate(merged):
        end = merged[i + 1][0] if i + 1 < len(merged) else len(text)
        chunk = text[start:end].strip()
        if chunk:
            parts.append(chunk)
    return parts or [text]
