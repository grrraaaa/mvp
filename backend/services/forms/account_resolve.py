"""Подбор счёта плательщика по заметке, названию или хвосту IBAN."""
from __future__ import annotations

import re
from typing import Any, Optional


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower().replace("ё", "е"))


def resolve_account_by_hint(accounts: list[Any], hint: str) -> Any | None:
    """Найти счёт по заметке/label («крутой», «добрый счёт»), IBAN или …2222."""
    query = _norm(hint)
    if not query or not accounts:
        return None

    compact_q = re.sub(r"\s+", "", query)
    if compact_q.startswith("by") and len(compact_q) >= 10:
        for acc in accounts:
            iban = re.sub(r"\s+", "", (acc.iban or "")).lower()
            if iban == compact_q or compact_q in iban:
                return acc

    digits = re.sub(r"\D", "", query)
    if len(digits) == 4:
        for acc in accounts:
            tail = re.sub(r"\D", "", acc.iban or "")[-4:]
            if tail == digits:
                return acc

    best: Any | None = None
    best_len = 0
    for acc in accounts:
        for raw in (acc.label, acc.note):
            lbl = _norm(str(raw or ""))
            if not lbl:
                continue
            if query == lbl or query in lbl or lbl in query:
                if len(lbl) > best_len:
                    best = acc
                    best_len = len(lbl)

    if best:
        return best

    tokens = [t for t in re.findall(r"[а-яёa-z0-9]+", query) if len(t) >= 3]
    for acc in accounts:
        lbl = _norm(f"{acc.label or ''} {acc.note or ''}")
        if tokens and all(tok in lbl for tok in tokens):
            return acc

    return accounts[0] if len(accounts) == 1 else None


def account_hint_from_message(message: str) -> Optional[str]:
    """Извлечь подсказку счёта плательщика: «со счета крутой»."""
    from services.forms.form_fill_segments import FIELD_VALUE_BOUNDARY

    m = re.search(
        rf"(?:со\s+сч[её]т\w*|с\s+сч[её]т\w*|сч[её]т\s+плательщик\w*)\s*[:—-]?\s*"
        rf"(.+?){FIELD_VALUE_BOUNDARY}",
        message,
        re.I,
    )
    if not m:
        return None
    hint = m.group(1).strip().rstrip(".,;")
    return hint or None
