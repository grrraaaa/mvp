"""Strict value formats for SBBOL payment form fields (OCR + LLM)."""
from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

from services.forms.number_parse import (
    is_valid_calendar_date,
    parse_amount_value,
    parse_doc_number_value,
)

IBAN_PATTERN = re.compile(r"BY\d{2}[A-Z0-9]{4}\d{20}", re.I)
DATE_PATTERN = re.compile(r"(\d{1,2})[./](\d{1,2})[./](\d{2,4})")

# Per-field rules for LLM prompt and post-processing.
FIELD_FORMATS: dict[str, dict[str, str]] = {
    "COMMON_COLUMNS_AMOUNT": {
        "format": "Число без валюты и пробелов; точка — разделитель копеек. Без «BYN», «руб».",
        "example": "2100.00",
    },
    "COMMON_COLUMNS_DOC_DATE": {
        "format": "Дата DD.MM.YYYY с ведущими нулями.",
        "example": "05.06.2026",
    },
    "COMMON_COLUMNS_DOC_NUMBER": {
        "format": "Только цифры номера документа, без «№» и слов.",
        "example": "247",
    },
    "CONTRAGENT_UNP": {
        "format": "Ровно 9 цифр УНП, без пробелов и префикса «УНП».",
        "example": "190123456",
    },
    "CONTRAGENT_ACCOUNT": {
        "format": "IBAN РБ: BY + 26 символов, uppercase, без пробелов.",
        "example": "BY13BPSB30121111111111111111",
    },
    "COMMON_COLUMNS_CUSTOMER_ACCOUNT": {
        "format": "IBAN счёта плательщика: BY + 26 символов, uppercase, без пробелов.",
        "example": "BY55BPSB30127777777777777777",
    },
    "PAYMENT_URGENCY": {
        "format": "1–2 цифры очередности (обычно 21). Только цифры.",
        "example": "21",
    },
    "PAYMENT_PURPOSE": {
        "format": "Полный текст назначения платежа одной строкой, без префикса «Назначение:».",
        "example": "Оплата по счёту №247 от 05.06.2026 за канцтовары",
    },
    "CONTRAGENT_ID": {
        "format": "Наименование получателя как в документе (ООО/ИП/ФИО), без реквизитов.",
        "example": 'ООО "Ромашка"',
    },
    "PAYMENT_PURPOSE_CATEGORY": {
        "format": "Категория назначения — только если явно указана в документе.",
        "example": "",
    },
    "PAYMENT_PURPOSE_CODE": {
        "format": "Код назначения — только цифры/код из документа.",
        "example": "",
    },
    "CHARGES_TYPE": {
        "format": "Способ удержания комиссии — только если указан в документе.",
        "example": "",
    },
}


def normalize_field_value(key: str, value: str) -> Optional[str]:
    """Coerce LLM/OCR output to the format expected by SBBOL form fill."""
    raw = (value or "").strip()
    if not raw:
        return None

    if key == "COMMON_COLUMNS_AMOUNT":
        parsed = parse_amount_value(raw)
        if not parsed:
            return None
        try:
            num = Decimal(parsed)
            if num < 0:
                return None
            if num == num.to_integral_value():
                return str(int(num))
            return f"{num:.2f}"
        except (InvalidOperation, ValueError):
            return None

    if key == "COMMON_COLUMNS_DOC_DATE":
        match = DATE_PATTERN.search(raw)
        if not match:
            return None
        day, month, year = match.groups()
        y = int(year if len(year) == 4 else f"20{year}")
        d, m = int(day), int(month)
        if not is_valid_calendar_date(d, m, y):
            return None
        return f"{d:02d}.{m:02d}.{y}"

    if key == "COMMON_COLUMNS_DOC_NUMBER":
        return parse_doc_number_value(raw)

    if key == "CONTRAGENT_UNP":
        digits = re.sub(r"\D", "", raw)
        return digits if len(digits) == 9 else None

    if key in ("CONTRAGENT_ACCOUNT", "COMMON_COLUMNS_CUSTOMER_ACCOUNT"):
        compact = re.sub(r"\s", "", raw).upper()
        if len(compact) == 28 and compact.startswith("BY"):
            return compact
        match = IBAN_PATTERN.search(compact)
        return match.group(0).upper() if match else None

    if key == "PAYMENT_URGENCY":
        digits = re.sub(r"\D", "", raw)[:2]
        return digits if digits else None

    if key == "PAYMENT_PURPOSE":
        text = re.sub(
            r"^назначени[ея]\s*(?:платеж\w*|оплаты?)?\s*[:—-]?\s*",
            "",
            raw,
            flags=re.I,
        ).strip()
        text = text.rstrip(".,;")
        return text if len(text) >= 3 else None

    if key == "CONTRAGENT_ID":
        text = raw.strip().strip('"').strip("'").strip()
        if re.match(r"^(сумм|номер|дата|унп|сч[её]т)", text, re.I):
            return None
        return text if len(text) >= 2 else None

    text = raw.rstrip(".,;")
    return text if text else None


def build_field_format_instructions(schema: dict[str, Any]) -> str:
    """Human-readable strict format spec for LLM system prompt."""
    lines = [
        "СТРОГИЙ ФОРМАТ ОТВЕТА (value для каждого поля):",
        'Ответ — только JSON через функцию fill_payment_form, массив fields.',
        'Каждый элемент: {"field": "<точный name>", "value": "<строго по формату>", "label": "<подпись>"}',
        "",
        "Поля и форматы value:",
    ]

    from services.ai.form_schemas import fillable_fields

    for field in fillable_fields(schema):
        key = field["key"]
        rules = FIELD_FORMATS.get(key, {"format": "Текст как в документе.", "example": ""})
        example = rules.get("example") or "—"
        lines.append(
            f"- field=\"{field['name']}\" ({field.get('label', key)}): "
            f"{rules['format']} Пример value: {example}"
        )

    lines.extend(
        [
            "",
            "Пример корректного ответа для платёжного поручения:",
            '{"fields": [',
            '  {"field": "forms.PAYDOCBY.COMMON_COLUMNS_AMOUNT", "value": "2100.00", "label": "Сумма"},',
            '  {"field": "forms.PAYDOCBY.CONTRAGENT_ID", "value": "ООО \\"Ромашка\\"", "label": "Получатель / контрагент"},',
            '  {"field": "forms.PAYDOCBY.CONTRAGENT_UNP", "value": "190123456", "label": "УНП получателя"},',
            '  {"field": "forms.PAYDOCBY.CONTRAGENT_ACCOUNT", "value": "BY13BPSB30121111111111111111", "label": "Счёт получателя"},',
            '  {"field": "forms.PAYDOCBY.COMMON_COLUMNS_DOC_NUMBER", "value": "247", "label": "№ документа"},',
            '  {"field": "forms.PAYDOCBY.COMMON_COLUMNS_DOC_DATE", "value": "05.06.2026", "label": "Дата документа"},',
            '  {"field": "forms.PAYDOCBY.PAYMENT_PURPOSE", "value": "Оплата по счёту №247 от 05.06.2026 за канцтовары", "label": "Назначение платежа"}',
            "]}",
            "",
            "Не включай поля radio/checkbox. Не выдумывай значения — пропускай поле, если его нет в OCR-тексте.",
        ]
    )
    return "\n".join(lines)


def normalize_form_actions(
    actions: list[Any],
    schema: dict[str, Any],
) -> list[Any]:
    """Normalize and filter form actions to SBBOL-compatible values."""
    from models.schemas import FormFieldAction

    by_name = {f["name"]: f for f in schema.get("fields", [])}
    result: list[FormFieldAction] = []

    for action in actions:
        field_meta = by_name.get(action.field)
        if not field_meta:
            continue
        key = field_meta.get("key", "")
        normalized = normalize_field_value(key, str(action.value))
        if not normalized:
            continue
        result.append(
            FormFieldAction(
                field=action.field,
                value=normalized,
                label=action.label or field_meta.get("label"),
            )
        )

    return result


def build_fill_tool(schema: dict[str, Any]) -> dict:
    """OpenAI tool schema with enum of allowed field names."""
    from services.ai.form_schemas import fillable_fields

    fillable = fillable_fields(schema)
    field_enum = [f["name"] for f in fillable]

    return {
        "type": "function",
        "function": {
            "name": "fill_payment_form",
            "description": (
                "Верни распознанные поля платёжной формы SBBOL. "
                "field — только из enum. value — строго в формате из system prompt."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "fields": {
                        "type": "array",
                        "description": "Список заполненных полей формы",
                        "items": {
                            "type": "object",
                            "properties": {
                                "field": {
                                    "type": "string",
                                    "enum": field_enum,
                                    "description": "Точный DOM name атрибут поля формы",
                                },
                                "value": {
                                    "type": "string",
                                    "description": "Значение в строгом формате для данного поля",
                                },
                                "label": {
                                    "type": "string",
                                    "description": "Русская подпись поля из схемы",
                                },
                            },
                            "required": ["field", "value", "label"],
                            "additionalProperties": False,
                        },
                    }
                },
                "required": ["fields"],
                "additionalProperties": False,
            },
        },
    }
