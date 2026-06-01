"""Parse OCR plain text into payment form field actions."""
from __future__ import annotations

import re
from typing import List, Optional

from models.schemas import FormFieldAction
from services.ai.assistant import _merge_form_fill_parsing
from services.ai.form_schemas import field_by_key, load_form_schema

# BY IBAN / account patterns
IBAN_PATTERN = re.compile(r"\bBY\d{2}[A-Z0-9]{4}\d{20}\b", re.I)
ACCOUNT_PATTERN = re.compile(r"\b\d{28}\b")
UNP_PATTERN = re.compile(r"(?:УНП|UNP)\s*[:№]?\s*(\d{9})", re.I)
BIC_PATTERN = re.compile(r"(?:БИК|BIC)\s*[:№]?\s*([A-Z0-9]{8,11})", re.I)


def _normalize_ocr_text(text: str) -> str:
    """Collapse OCR noise; keep line breaks for labeled fields."""
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]
    return "\n".join(lines)


def _extract_labeled_value(text: str, labels: list[str]) -> Optional[str]:
    for label in labels:
        m = re.search(
            rf"(?:{re.escape(label)})\s*[:№\-—]?\s*(.+?)(?:\n|$)",
            text,
            re.I | re.M,
        )
        if m:
            val = m.group(1).strip().rstrip(".,;")
            if len(val) >= 1:
                return val
    return None


def _ocr_extra_fields(text: str, form_type: str) -> List[FormFieldAction]:
    """Heuristics for unstructured OCR (invoices, scanned payment orders)."""
    schema = load_form_schema(form_type)
    if not schema:
        return []

    actions: List[FormFieldAction] = []
    seen: set[str] = set()

    def add(key: str, value: str) -> None:
        meta = field_by_key(schema, key)
        if not meta or not value or meta["name"] in seen:
            return
        seen.add(meta["name"])
        actions.append(
            FormFieldAction(
                field=meta["name"],
                value=value,
                label=meta.get("label"),
            )
        )

    # Amount: "1 500,00" / "1500.00 BYN" / "Сумма: 1500"
    for m in re.finditer(
        r"(?:сумм\w*|amount|итого|к\s+оплат\w*)\s*[:№]?\s*(\d[\d\s]*(?:[.,]\d{1,2})?)",
        text,
        re.I,
    ):
        raw = m.group(1).replace(" ", "").replace(",", ".")
        if raw:
            add("COMMON_COLUMNS_AMOUNT", raw)
            break

    purpose = _extract_labeled_value(
        text,
        ["назначение платежа", "назначение", "purpose", "за"],
    )
    if purpose:
        add("PAYMENT_PURPOSE", purpose)

    recipient = _extract_labeled_value(
        text,
        ["получатель", "контрагент", "наименование получателя", "бенефициар"],
    )
    if recipient:
        add("CONTRAGENT_ID", recipient)

    doc_num = _extract_labeled_value(text, ["номер документа", "№ документа", "документ №"])
    if doc_num:
        add("COMMON_COLUMNS_DOC_NUMBER", re.sub(r"\D", "", doc_num) or doc_num)

    date_m = re.search(
        r"(?:дата)\s*[:№]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})",
        text,
        re.I,
    )
    if date_m:
        add("COMMON_COLUMNS_DOC_DATE", date_m.group(1).replace("/", "."))

    iban = IBAN_PATTERN.search(text)
    if iban:
        add("CONTRAGENT_ACCOUNT", iban.group(0).upper())

    if not iban:
        accounts = ACCOUNT_PATTERN.findall(text)
        if accounts:
            add("CONTRAGENT_ACCOUNT", accounts[-1])

    unp = UNP_PATTERN.search(text)
    if unp:
        # Store in recipient if no separate UNP field
        if "CONTRAGENT_ID" not in seen:
            pass  # optional: could extend schema

    urgency = re.search(r"очередност\w*\s*[:№]?\s*(\d)", text, re.I)
    if urgency:
        add("PAYMENT_URGENCY", urgency.group(1))

    return actions


def parse_ocr_text_to_form_actions(text: str, form_type: str) -> List[FormFieldAction]:
    normalized = _normalize_ocr_text(text)
    # Flatten for rule-based parser (commas between detected phrases)
    flat = normalized.replace("\n", ", ")

    rule_actions = _merge_form_fill_parsing(flat, form_type) or []
    ocr_actions = _ocr_extra_fields(normalized, form_type)

    merged: dict[str, FormFieldAction] = {}
    for action in rule_actions + ocr_actions:
        merged[action.field] = action

    return list(merged.values())
