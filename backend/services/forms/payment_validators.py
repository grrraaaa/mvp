"""Валидация полей платёжного поручения РБ (демо)."""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class FieldHint:
    field: str
    level: str  # ok | warn | error
    message: str


# Идентификатор банка в IBAN РБ (символы 5–8) → БИК/название (демо-справочник).
BANK_BY_IBAN_CODE: dict[str, tuple[str, str]] = {
    "BPSB": ("BPSBBY2X", 'ОАО "Сбер Банк"'),
    "AKBB": ("AKBBBY2X", 'ОАО "АСБ Беларусбанк"'),
    "BLBB": ("BLBBBY2X", 'ОАО "Белинвестбанк"'),
    "ALFA": ("ALFABY2X", 'ЗАО "Альфа-Банк"'),
    "PJCB": ("PJCBBY2X", '"Приорбанк" ОАО'),
    "BELB": ("BELBBY2X", 'ОАО "Банк БелВЭБ"'),
    "MMBN": ("MMBNBY22", 'ЗАО "МТБанк"'),
    "UNBS": ("UNBSBY2X", 'ЗАО "БСБ Банк"'),
    "POIS": ("POISBY2X", 'ОАО "Паритетбанк"'),
}


def _digits_only(s: str) -> str:
    return re.sub(r"\D", "", s)


def validate_unp(unp: str) -> FieldHint | None:
    raw = _digits_only(unp)
    if not raw:
        return FieldHint("unp", "error", "УНП не указан.")
    if len(raw) != 9:
        return FieldHint("unp", "error", f"УНП должен содержать 9 цифр (сейчас {len(raw)}).")
    return FieldHint("unp", "ok", f"УНП {raw} — формат корректен.")


def bank_from_iban(iban: str) -> tuple[str, str] | None:
    """Вернуть (БИК, название банка) по IBAN РБ, если банк известен."""
    compact = iban.replace(" ", "").upper()
    if len(compact) < 8 or not compact.startswith("BY"):
        return None
    code = compact[4:8]
    return BANK_BY_IBAN_CODE.get(code)


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
    bank = bank_from_iban(compact)
    bank_text = f" Банк: {bank[1]} (БИК {bank[0]})." if bank else ""
    return FieldHint("iban", "ok", f"IBAN {compact[:8]}… — формат BY, контрольная сумма OK.{bank_text}")


_WEEKDAYS_RU = ("понедельник", "вторник", "среду", "четверг", "пятницу", "субботу", "воскресенье")


def validate_exec_date(exec_date: str) -> FieldHint | None:
    """Предупредить, если дата исполнения приходится на выходной."""
    text = (exec_date or "").strip()
    if not text:
        return None
    parsed: date | None = None
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d.%m.%y"):
        try:
            parsed = datetime.strptime(text, fmt).date()
            break
        except ValueError:
            continue
    if not parsed:
        return None
    if parsed.weekday() >= 5:
        return FieldHint(
            "exec_date",
            "warn",
            f"Дата исполнения ({text}) выпадает на {_WEEKDAYS_RU[parsed.weekday()]} — "
            "банковский день будет перенесён на ближайший рабочий.",
        )
    return FieldHint("exec_date", "ok", f"Дата исполнения {text} — рабочий день.")


def validate_currency_residency(currency: str, counterparty_country: str = "BY") -> FieldHint | None:
    """Сопоставить валюту платежа и резидентство контрагента."""
    cur = (currency or "BYN").upper()
    country = (counterparty_country or "BY").upper()
    if cur == "BYN" and country not in ("BY", "БЕЛАРУСЬ", ""):
        return FieldHint(
            "currency",
            "warn",
            "Платёж в BYN нерезиденту — обычно требуется валютный контроль. Проверьте назначение и договор.",
        )
    if cur != "BYN" and country in ("BY", "БЕЛАРУСЬ"):
        return FieldHint(
            "currency",
            "warn",
            f"Валютный платёж ({cur}) резиденту РБ возможен только в случаях, разрешённых законодательством.",
        )
    if cur != "BYN":
        return FieldHint(
            "currency",
            "warn",
            f"Валютный платёж ({cur}) — подготовьте документы для валютного контроля.",
        )
    return None


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


def validate_purpose(
    purpose: str,
    required: bool = True,
    *,
    form_type: str = "",
) -> FieldHint | None:
    text = (purpose or "").strip()
    instant = form_type == "instant"
    min_len = 2 if instant else 5

    if not text:
        if required:
            return FieldHint("purpose", "warn", "Укажите назначение платежа.")
        return None
    if len(text) < min_len:
        return FieldHint(
            "purpose",
            "warn",
            f"Назначение слишком короткое — укажите не менее {min_len} символов.",
        )
    if not instant and len(text) < 15 and not re.search(
        r"договор|счёт|счет|№|акт|услуг|оплат|аренд|офис|зарплат|налог", text, re.I
    ):
        return FieldHint(
            "purpose",
            "warn",
            "Добавьте в назначение номер договора или счёта (рекомендуется для платёжного поручения).",
        )
    return FieldHint("purpose", "ok", "Назначение платежа заполнено.")


def hints_for_payment(
    *,
    unp: str = "",
    iban: str = "",
    amount: float | None = None,
    purpose: str = "",
    daily_limit: float = 5000.0,
    counterparty_name: str = "",
    exec_date: str = "",
    currency: str = "BYN",
    counterparty_country: str = "BY",
    form_type: str = "",
) -> list[FieldHint]:
    out: list[FieldHint] = []
    if unp:
        h = validate_unp(unp)
        if h:
            if h.level == "ok" and counterparty_name:
                h = FieldHint("unp", "ok", f"УНП {_digits_only(unp)} → {counterparty_name}.")
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
        h = validate_purpose(purpose, form_type=form_type)
        if h:
            out.append(h)
    cur_hint = validate_currency_residency(currency, counterparty_country)
    if cur_hint:
        out.append(cur_hint)
    if exec_date:
        h = validate_exec_date(exec_date)
        if h:
            out.append(h)
    return out


def has_critical_error(hints: list[FieldHint]) -> bool:
    return any(h.level == "error" for h in hints)
