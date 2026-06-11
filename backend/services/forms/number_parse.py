"""Парсинг чисел из голоса/чата для полей платёжной формы."""
from __future__ import annotations

import calendar
import re
from typing import Optional

_RUS_UNITS: dict[str, int] = {
    "ноль": 0,
    "один": 1,
    "одна": 1,
    "одну": 1,
    "два": 2,
    "две": 2,
    "три": 3,
    "четыре": 4,
    "пять": 5,
    "шесть": 6,
    "семь": 7,
    "восемь": 8,
    "девять": 9,
    "десять": 10,
    "одиннадцать": 11,
    "двенадцать": 12,
    "тринадцать": 13,
    "четырнадцать": 14,
    "пятнадцать": 15,
    "шестнадцать": 16,
    "семнадцать": 17,
    "восемнадцать": 18,
    "девятнадцать": 19,
}

_RUS_TENS: dict[str, int] = {
    "двадцать": 20,
    "тридцать": 30,
    "сорок": 40,
    "пятьдесят": 50,
    "шестьдесят": 60,
    "семьдесят": 70,
    "восемьдесят": 80,
    "девяносто": 90,
}

_RUS_HUNDREDS: dict[str, int] = {
    "сто": 100,
    "двести": 200,
    "триста": 300,
    "четыреста": 400,
    "пятьсот": 500,
    "шестьсот": 600,
    "семьсот": 700,
    "восемьсот": 800,
    "девятьсот": 900,
}

_RUS_MULTIPLIERS: dict[str, int] = {
    "тысяча": 1_000,
    "тысячи": 1_000,
    "тысяч": 1_000,
    "миллион": 1_000_000,
    "миллиона": 1_000_000,
    "миллионов": 1_000_000,
}


def _word_to_int(word: str) -> Optional[int]:
    w = word.lower().strip()
    if w in _RUS_UNITS:
        return _RUS_UNITS[w]
    if w in _RUS_TENS:
        return _RUS_TENS[w]
    if w in _RUS_HUNDREDS:
        return _RUS_HUNDREDS[w]
    for stem, val in _RUS_UNITS.items():
        if len(stem) >= 3 and w.startswith(stem[:4]):
            return val
    for stem, val in _RUS_TENS.items():
        if w.startswith(stem[:4]):
            return val
    for stem, val in _RUS_HUNDREDS.items():
        if w.startswith(stem[:4]):
            return val
    return None


def parse_russian_integer(text: str) -> Optional[int]:
    """«пять тысяч» → 5000, «пять тысяч пятьсот» → 5500."""
    low = (text or "").lower().strip()
    if not low or not re.search(r"[а-яё]", low):
        return None

    total = 0
    current = 0
    for word in re.findall(r"[а-яё]+", low):
        if word in _RUS_MULTIPLIERS:
            mult = _RUS_MULTIPLIERS[word]
            chunk = current if current else 1
            total += chunk * mult
            current = 0
            continue
        val = _word_to_int(word)
        if val is None:
            continue
        current += val

    total += current
    return total if total > 0 else None


def parse_grouped_integer(raw: str) -> Optional[int]:
    """Целое число: 5000, 5 000, 5.000, 5,000, «пять тысяч»."""
    text = (raw or "").strip()
    if not text:
        return None

    from_words = parse_russian_integer(text)
    if from_words is not None:
        return from_words

    compact = re.sub(r"\s+", "", text)
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", compact):
        return int(compact.replace(".", ""))
    if re.fullmatch(r"\d{1,3}(?:,\d{3})+", compact):
        return int(compact.replace(",", ""))

    digits = re.sub(r"\D", "", compact)
    if digits:
        return int(digits)
    return None


def parse_doc_number_value(raw: str) -> Optional[str]:
    """Номер документа — только цифры, без потери тысяч."""
    num = parse_grouped_integer(raw)
    if num is None or num < 0:
        return None
    return str(num)


def parse_amount_value(raw: str) -> Optional[str]:
    """Сумма: тысячные разделители и копейки."""
    text = (raw or "").strip()
    if not text:
        return None

    from_words = parse_russian_integer(text)
    if from_words is not None:
        return str(from_words)

    compact = re.sub(r"\s+", "", text).replace(",", ".")
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", compact):
        return str(int(compact.replace(".", "")))

    m = re.fullmatch(r"(\d+)(?:\.(\d{1,2}))?", compact)
    if m:
        whole, frac = m.group(1), m.group(2)
        if frac:
            return f"{int(whole)}.{frac.ljust(2, '0')[:2]}"
        return str(int(whole))

    num = parse_grouped_integer(text)
    return str(num) if num is not None else None


def _looks_like_date_fragment(frag: str) -> bool:
    return bool(re.fullmatch(r"\d{1,2}[./]\d{1,2}[./]\d{2,4}", (frag or "").strip()))


def extract_doc_number_fragment(message: str) -> Optional[str]:
    """Вырезать значение после «номер документа» / «документ №»."""
    from services.forms.form_fill_segments import FIELD_VALUE_BOUNDARY

    boundary = FIELD_VALUE_BOUNDARY
    patterns = (
        rf"(?:номер\w*|№)\s*(?:документ\w*)?\s*[:№]?\s*(.+?){boundary}",
        rf"(?<!дата\s)документ\w*\s*(?:№|номер\w+)\s*(.+?){boundary}",
    )
    for pat in patterns:
        m = re.search(pat, message, re.I)
        if m:
            frag = m.group(1).strip().rstrip(".,;")
            if frag and not _looks_like_date_fragment(frag):
                return frag
    return None


def is_valid_calendar_date(day: int, month: int, year: int) -> bool:
    if month < 1 or month > 12 or day < 1:
        return False
    return day <= calendar.monthrange(year, month)[1]
