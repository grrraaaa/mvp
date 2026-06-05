"""Валидация полей платёжного поручения РБ (демо)."""
from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class FieldHint:
    field: str
    level: str  # ok | warn | error
    message: str


def _digits_only(s: str) -> str:
    return re.sub(r"\D", "", s)


def validate_unp(unp: str) -> FieldHint | None:
    raw = _digits_only(unp)
    if not raw:
        return FieldHint("unp", "error", "УНП не указан.")
    if len(raw) != 9:
        return FieldHint("unp", "error", f"УНП должен содержать 9 цифр (сейчас {len(raw)}).")
    return FieldHint("unp", "ok", f"УНП {raw} — формат корректен.")


def validate_iban(iban: str) -> FieldHint | None:
    compact = iban.replace(" ", "").upper()
    if not compact.startswith("BY") or len(compact) != 28:
        return FieldHint("iban", "error", "IBAN РБ: 28 символов, начинается с BY.")
    rearranged = compact[4:] + compact[:4]
    converted = "".join(str(int(ch, 36)) if ch.isalpha() else ch for ch in rearranged)
    try:
        if int(converted) % 97 != 1:
            return FieldHint("iban", "warn", "Контрольная сумма IBAN не сходится — проверьте реквизиты.")
    except ValueError:
        return FieldHint("iban", "error", "IBAN содержит недопустимые символы.")
    return FieldHint("iban", "ok", f"IBAN {compact[:8]}… — формат BY, контрольная сумма OK.")


def validate_amount(amount: float, daily_limit: float = 5000.0) -> FieldHint | None:
    if amount <= 0:
        return FieldHint("amount", "error", "Сумма должна быть больше нуля.")
    if amount > daily_limit:
        return FieldHint(
            "amount",
            "warn",
            f"Сумма превышает дневной лимит ({daily_limit:.0f} BYN). Подтвердите или запросите увеличение.",
        )
    return FieldHint("amount", "ok", f"Сумма {amount:.2f} BYN в пределах лимита.")


def validate_purpose(purpose: str, required: bool = True) -> FieldHint | None:
    text = (purpose or "").strip()
    if required and len(text) < 5:
        return FieldHint(
            "purpose",
            "warn",
            "Добавьте назначение платежа — номер договора или счёта (обязательно для данного типа).",
        )
    return FieldHint("purpose", "ok", "Назначение платежа заполнено.")


def hints_for_payment(
    *,
    unp: str = "",
    iban: str = "",
    amount: float | None = None,
    purpose: str = "",
    daily_limit: float = 5000.0,
) -> list[FieldHint]:
    out: list[FieldHint] = []
    if unp:
        h = validate_unp(unp)
        if h:
            out.append(h)
    if iban:
        h = validate_iban(iban)
        if h:
            out.append(h)
    if amount is not None:
        h = validate_amount(amount, daily_limit)
        if h:
            out.append(h)
    if purpose or unp:
        h = validate_purpose(purpose)
        if h:
            out.append(h)
    return out
