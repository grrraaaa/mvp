"""Parse OCR plain text into payment form field actions.

Справляется с двумя стилями OCR-текста:
  • структурированный: «Сумма: 1500», «Получатель: ООО Ромашка»;
  • фрагментарный: «Получатель Из справочника Ввести вручную ООО Белнефтехим
    Плательщик Со счета BY51 … BYN Сумма 22222 BYN Назначение платежа Прям…» —
    метки и значения идут подряд, без двоеточий, между ними — UI-фразы
    («Из справочника», «Ввести вручную» и т.п.).

Ключевая защита: IBAN после метки «Плательщик» идёт в
COMMON_COLUMNS_CUSTOMER_ACCOUNT (счёт отправителя), а не в CONTRAGENT_ACCOUNT
(счёт получателя). Без этого любой платёжный документ заливал бы IBAN
плательщика в получателя.
"""
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

# UI-фразы, которые OCR вытаскивает между меткой и значением.
# Удаляем их В ТЕКСТЕ (а не построчно) — фрагментарный OCR часто идёт одной
# строкой вида «Получатель Из справочника Ввести вручную ООО Белнефтехим».
_NOISE_LABELS = re.compile(
    r"\s*(?:из\s+справочник\w*|ввести\s+вручную|со\s+счет\w*|"
    r"с\s+другого\s+счет\w*|ручной\s+ввод|выбрать\s+из\s+списк\w*|"
    r"реквизит\w*\s*\+|указать\s+фактическ\w*\s+плательщик\w*|"
    r"текущ\w*\s+\(расчетн\w*\)\s+счет\w*|демо\s+юридическ\w*\s+лиц\w*|"
    r"время\s+приема\s+документ\w*|к\s+оплат\w*)\s*",
    re.I,
)


def _strip_noise_lines(text: str) -> str:
    """Удалить UI-фразы из текста. Работает и для одной длинной строки, и для многострочного OCR."""
    if not text:
        return ""
    cleaned = _NOISE_LABELS.sub(" ", text)
    # Схлопнем повторные пробелы.
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    # Удалим «голые» пустые строки.
    return "\n".join(ln.strip() for ln in cleaned.splitlines() if ln.strip())


def _normalize_ocr_text(text: str) -> str:
    """Collapse OCR noise; keep line breaks for labeled fields."""
    cleaned = _strip_noise_lines(text or "")
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in cleaned.splitlines()]
    lines = [ln for ln in lines if ln]
    return "\n".join(lines)


def _split_segments(text: str) -> dict[str, str]:
    """Разрезать OCR-текст по меткам «Плательщик», «Получатель», «Сумма», «Назначение».

    Возвращает dict: section → текст ПОСЛЕ метки до следующей метки (или конца).
    """
    labels = {
        "payer": r"плательщик\w*",
        "recipient": r"получател\w*|контрагент\w*|бенефициар\w*",
        "amount": r"сумм\w*|итого|к\s+оплат\w*|amount",
        "purpose": r"назначени\w*\s+платеж\w*|назначени\w*|purpose",
        "doc_num": r"номер\w*\s+документ\w*|№\s*документ\w*|документ\s*№",
        "date": r"\bдата\b",
    }

    lower = text.lower()
    # Найдём позиции всех меток в порядке появления.
    spans: list[tuple[int, int, str]] = []
    for key, pat in labels.items():
        for m in re.finditer(pat, lower, re.I):
            spans.append((m.end(), m.start(), key))
    spans.sort()

    segments: dict[str, str] = {}
    for i, (start, label_pos, key) in enumerate(spans):
        end = spans[i + 1][1] if i + 1 < len(spans) else len(text)
        # Берём текст от конца метки до начала следующей (если следующая есть).
        seg = text[start:end].strip()
        # Срезаем двоеточие / дефис / перенос строки сразу после метки.
        seg = re.sub(r"^[:\-—\s]+", "", seg).strip()
        if seg:
            # Не перезаписываем, если у этой метки уже что-то есть — оставляем первое вхождение.
            segments.setdefault(key, seg)

    return segments


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


def _parse_amount_token(raw: str) -> Optional[str]:
    """Привести «2 222», «2 222,00», «22222 BYN», «1500.00» к канонической форме."""
    if not raw:
        return None
    cleaned = raw.replace(" ", "").replace("\u00a0", "").replace(",", ".")
    # Отрежем хвостовые буквы валют.
    cleaned = re.sub(r"(byn|руб\.?|р\.?)$", "", cleaned, flags=re.I).strip()
    if not re.fullmatch(r"\d+(\.\d{0,2})?", cleaned):
        return None
    if "." not in cleaned:
        cleaned += ".00"
    else:
        # Дополним копейки до 2 знаков.
        whole, frac = cleaned.split(".", 1)
        frac = (frac + "00")[:2]
        cleaned = f"{whole}.{frac}"
    return cleaned


def _parse_unp_token(raw: str) -> Optional[str]:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    return digits if len(digits) == 9 else None


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

    segments = _split_segments(text)

    # ── Плательщик: IBAN + имя счёта ────────────────────────────────────────
    payer_seg = segments.get("payer", "")
    payer_iban = IBAN_PATTERN.search(payer_seg)
    if payer_iban:
        add("COMMON_COLUMNS_CUSTOMER_ACCOUNT", payer_iban.group(0).upper())

    # ── Получатель: имя, IBAN, УНП — берём ТОЛЬКО из секции «Получатель» ───
    recipient_seg = segments.get("recipient", "")
    # Имя получателя: первая «человекочитаемая» строка, которая не UI-шум.
    if recipient_seg:
        # Удалим «Из справочника / Ввести вручную» внутри секции.
        clean = _strip_noise_lines(recipient_seg)
        # Удалим IBAN/УНП/БИК из текстового представления имени.
        clean = IBAN_PATTERN.sub("", clean)
        clean = UNP_PATTERN.sub("", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ,.;:\n\t")
        # Возьмём первые 2–4 слова как имя (если похоже на «ООО …», «ИП …», «ОАО …»).
        m = re.search(
            r"((?:ООО|ОАО|ЗАО|ИП|ОДО|ЧУП|ГП|СПК|ТОО)\s+[«\"']?[\w\-]+(?:[\s\-]+[\w\-]+){0,3})",
            clean,
            re.I,
        )
        if m:
            add("CONTRAGENT_ID", m.group(1).strip().rstrip(".,;"))
        elif clean and len(clean) >= 3 and not _NOISE_LABELS.match(clean):
            add("CONTRAGENT_ID", clean[:120].rstrip(".,;"))

    recipient_iban = IBAN_PATTERN.search(recipient_seg) if recipient_seg else None
    if recipient_iban:
        add("CONTRAGENT_ACCOUNT", recipient_iban.group(0).upper())
    else:
        # Если в секции «Получатель» IBAN не нашёлся — НЕ лазим по всему тексту
        # (иначе схватим IBAN плательщика).
        recipient_unp = UNP_PATTERN.search(recipient_seg) if recipient_seg else None
        if recipient_unp:
            add("CONTRAGENT_UNP", recipient_unp.group(1))

    # УНП может быть и в общем тексте, если в секции получателя не было.
    if "CONTRAGENT_UNP" not in seen:
        full_unp = UNP_PATTERN.search(text)
        if full_unp:
            add("COMMON_COLUMNS_DOC_NUMBER", "")  # noop, чтобы не перезаписывать
            unp_val = full_unp.group(1)
            if _parse_unp_token(unp_val):
                add("CONTRAGENT_UNP", unp_val)
        # УНП в формате «УНП 190123456» без двоеточий мы и так уже ловим выше.

    # ── Сумма: только из секции «Сумма» (иначе «итого» в адресе собьёт) ────
    amount_seg = segments.get("amount", "")
    if amount_seg:
        # Берём первое число, в т.ч. с пробелами/запятыми и хвостовой валютой.
        m = re.search(
            r"(\d[\d\s\xa0]*(?:[.,]\d{1,2})?)(?:\s*(?:byn|руб\.?|р\.?))?",
            amount_seg,
            re.I,
        )
        if m:
            normalized_amount = _parse_amount_token(m.group(1))
            if normalized_amount:
                add("COMMON_COLUMNS_AMOUNT", normalized_amount)

    # ── Назначение платежа: текст после метки до конца / следующей секции ───
    purpose_seg = segments.get("purpose", "")
    if purpose_seg:
        # Срежем очевидные UI-хвосты.
        cleaned = re.sub(r"\s+", " ", purpose_seg).strip().rstrip(".,;")
        # Если в начале секции осталось двоеточие/дефис — срежем.
        cleaned = re.sub(r"^[:\-—\s]+", "", cleaned)
        if cleaned and not _NOISE_LABELS.match(cleaned) and len(cleaned) >= 2:
            add("PAYMENT_PURPOSE", cleaned[:500])

    # ── Номер документа: только из секции «Номер документа» ────────────────
    doc_num_seg = segments.get("doc_num", "")
    if doc_num_seg:
        digits = re.sub(r"\D", "", doc_num_seg)
        if digits:
            add("COMMON_COLUMNS_DOC_NUMBER", digits[:20])
        else:
            # Фолбэк: первое осмысленное слово.
            first = doc_num_seg.split()[0] if doc_num_seg.split() else ""
            if first:
                add("COMMON_COLUMNS_DOC_NUMBER", re.sub(r"\D", "", first) or first)

    # ── Дата документа: только из секции «Дата» ─────────────────────────────
    date_seg = segments.get("date", "")
    if date_seg:
        m = re.search(r"(\d{1,2}[./]\d{1,2}[./]\d{2,4})", date_seg)
        if m:
            add("COMMON_COLUMNS_DOC_DATE", m.group(1).replace("/", "."))

    # ── Очередность: глобально (в бел. платёжках часто внизу) ──────────────
    urgency = re.search(r"очер[её]дност\w*\s*[:№]?\s*(\d{1,2})", text, re.I)
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
