"""AI Assistant — OpenRouter / OpenAI + rule-based fallback, навигация по SBBOL."""
from __future__ import annotations
import json
import logging
import uuid
import re
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

from core.config import settings

logger = logging.getLogger(__name__)
from models.schemas import AssistantResponse, NavigationStep, BankProduct, ActionButton, ChartSpec, FormFieldAction, SourceRef
from db.database import AsyncSessionLocal
from services.banking.queries import handle_banking_query, get_org_profile, lookup_counterparty
from services.onec.assistant import handle_onec_query
from services.ui.page_actions import get_page_help, get_page_quick_actions, handle_page_ui_action
from services.banking.services_consult import find_service, format_service_reply
from services.forms.payment_validators import hints_for_payment
from services.navigation.navigation_service import NavigationService
from services.navigation.demo_routes import (
    DEMO_ROUTE_LABELS,
    build_demo_nav_path,
    is_create_document_request,
    is_navigation_message,
    match_demo_route,
)
from services.products.product_service import ProductService
from services.ai.form_schemas import (
    load_form_schema,
    schema_field_summary,
    fillable_fields,
    field_by_key,
    field_labels_for_keys,
)
from services.sber_links import (
    SYSTEM_PROMPT,
    catalog_url,
    detect_insurance_product,
    format_link_line,
    insurance_clarify_buttons,
    insurance_clarify_message,
    product_url,
    response_message,
    sanitize_message_urls,
    sanitize_url,
    section_label,
    section_url,
)

INTENTS = [
    {
        "intent": "payments",
        "patterns": [
            r"платёж", r"платеж", r"перевод", r"расчёт", r"расчет", r"поручени",
            r"контрагент", r"документ", r"оплат",
        ],
        "section": "payments",
        "product_type": None,
    },
    {
        "intent": "statement",
        "patterns": [r"выписк", r"оборот", r"справк", r"остаток\s+на\s+сч"],
        "section": "statement",
        "product_type": None,
    },
    {
        "intent": "salary",
        "patterns": [r"зарплат", r"сотрудник", r"ведомост", r"зарплатн\w*\s+проект"],
        "section": "salary",
        "product_type": None,
    },
    {
        "intent": "credit",
        "patterns": [r"кредит", r"овердрафт", r"ссуд", r"кредитн\w*\s+лин"],
        "section": "credits",
        "product_type": "credit",
    },
    {
        "intent": "deposit",
        "patterns": [r"депозит", r"вклад", r"разместить\s+средств"],
        "section": "deposits",
        "product_type": "deposit",
    },
    {
        "intent": "corpo_card_transfers",
        "patterns": [
            r"перевод\w*\s+на\s+корпоративн",
            r"пополнени\w*\s+карточн",
            r"pay_doc_corpo",
        ],
        "section": "corpo_card_transfers",
        "product_type": None,
    },
    {
        "intent": "cards",
        "patterns": [r"корпоративн\w*\s+карт", r"business\s+card", r"visa\s+business", r"управлени\w*\s+карт"],
        "section": "cards",
        "product_type": None,
    },
    {
        "intent": "ved",
        "patterns": [r"вэд", r"валютн\w*\s+контрол", r"таможн", r"экспорт", r"импорт"],
        "section": "ved",
        "product_type": None,
    },
    {
        "intent": "counterparty",
        "patterns": [r"проверк\w*\s+контрагент", r"благонадёжност", r"due\s+diligence"],
        "section": "counterparty_check",
        "product_type": None,
    },
    {
        "intent": "services",
        "patterns": [r"аналитик", r"курс\w*\s+валют", r"обучени", r"сервис", r"эквайринг", r"тариф"],
        "section": "services",
        "product_type": None,
    },
    {
        "intent": "tax",
        "patterns": [r"налог", r"фсзн", r"отчётност", r"отчетност", r"ндс", r"подоходн", r"бухгалтер"],
        "section": "salary",
        "product_type": None,
    },
    {
        "intent": "finance",
        "patterns": [r"финанс", r"бюджет", r"кассов\w*\s+разрыв", r"дефицит", r"расход\w*\s+по\s+категор"],
        "section": "statement",
        "product_type": None,
    },
    {
        "intent": "products",
        "patterns": [r"продукт", r"услуг\w*\s+для\s+бизнес", r"юрлиц", r"организац"],
        "section": "products",
        "product_type": None,
    },
    {
        "intent": "info_requests",
        "patterns": [
            r"запрос\w*\s+выписк",
            r"запрос\w*\s+информац",
            r"информац\w*\s+по\s+счет",
            r"остаток\s+по\s+счет",
        ],
        "section": "info_requests",
        "product_type": None,
    },
]

RATE_PATTERN = re.compile(r"(\d+[.,]?\d*)\s*%")
AMOUNT_PATTERN = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:руб|byn|бел\.?\s*руб|р\.?)?", re.I)
AMOUNT_ONLY_PATTERN = re.compile(
    r"^\s*(\d+(?:[.,]\d+)?)\s*(?:руб|byn|бел\.?\s*руб|р\.?)?\s*\.?\s*$",
    re.I,
)
SUM_LABELED_PATTERN = re.compile(
    r"сумм\w*\s*[:—-]?\s*(\d+(?:[.,]\d+)?)",
    re.I,
)
DATE_PATTERN = re.compile(r"(\d{1,2})[./](\d{1,2})[./](\d{2,4})")

_FORM_FILL_SESSIONS: Dict[str, Dict[str, Any]] = {}

# «очередность» и «очерёдность»
URGENCY_WORD_RE = r"очер[её]дност"


@dataclass
class _FormFillState:
    form_type: str
    filled: Dict[str, str] = field(default_factory=dict)  # field name → value
    pending_key: Optional[str] = None
    active: bool = False


def _detect_intent(message: str) -> Optional[dict]:
    msg = message.lower()
    for intent_cfg in INTENTS:
        for pat in intent_cfg["patterns"]:
            if re.search(pat, msg):
                return intent_cfg
    return None


def _is_greeting_or_empty(message: str) -> bool:
    low = message.lower().strip()
    if not low:
        return True
    return bool(
        re.match(
            r"^(привет|здравствуй|добрый\s+(?:день|утро|вечер)|hello|hi|start|начать)\b",
            low,
        )
    )


def _payment_hints_from_state(filled: Dict[str, str], daily_limit: float = 5000.0) -> str:
    unp = filled.get("CONTRAGENT_UNP", "")
    iban = filled.get("CONTRAGENT_ACCOUNT", "")
    purpose = filled.get("PAYMENT_PURPOSE", "")
    amount_raw = filled.get("COMMON_COLUMNS_AMOUNT", "")
    amount: float | None = None
    if amount_raw:
        try:
            amount = float(str(amount_raw).replace(",", ".").replace(" ", ""))
        except ValueError:
            pass
    hints = hints_for_payment(unp=unp, iban=iban, amount=amount, purpose=purpose, daily_limit=daily_limit)
    lines = [f"• {h.message}" for h in hints if h.level != "ok"]
    ok_lines = [h for h in hints if h.level == "ok"]
    if not lines and ok_lines:
        lines = [f"✓ {h.message}" for h in ok_lines[:2]]
    return "\n".join(lines) if lines else ""


def _extract_max_rate(message: str) -> Optional[float]:
    m = RATE_PATTERN.search(message)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def _external_products(products: List[BankProduct]) -> List[BankProduct]:
    return [
        BankProduct(
            id=p.id,
            name=p.name,
            type=p.type,
            rate=p.rate,
            description=p.description,
            url=sanitize_url(product_url(p.url) if p.url.startswith("/") else p.url),
        )
        for p in products
    ]


def _looks_like_form_fill(message: str) -> bool:
    msg = message.lower()
    triggers = [
        r"заполни", r"заполн", r"введи", r"укажи", r"поставь", r"сумм",
        r"назначени", r"получател", r"номер документ", r"дата документ",
        URGENCY_WORD_RE, r"бик", r"сч[её]т", r"платежк", r"поручени",
        r"оплат[аы]\s", r"документ", r"получател",
    ]
    return any(re.search(p, msg) for p in triggers)


def _wants_form_fill_help(message: str) -> bool:
    msg = message.lower()
    return bool(
        re.search(
            r"помог\w*\s+(?:мне\s+)?(?:заполн|заполни|заполнить)|"
            r"(?:заполн\w*|заполни)\s+(?:форм|платеж|платёж|поручени|платежк)|"
            r"как\s+заполн",
            msg,
        )
    )


_FIELD_HINT_PATTERNS = (
    r"сумм",
    r"назначени",
    r"получател",
    r"контрагент",
    r"номер",
    r"дата",
    r"очеред",
    r"сч[её]т",
    r"iban",
)


def _count_field_hints(message: str) -> int:
    msg = message.lower()
    return sum(1 for pat in _FIELD_HINT_PATTERNS if re.search(pat, msg))


def _is_multi_field_message(message: str) -> bool:
    parts = [p.strip() for p in re.split(r"[,;\n]+", message) if p.strip()]
    return len(parts) > 1 or _count_field_hints(message) >= 2


def _message_mentions_amount(message: str) -> bool:
    msg = message.lower()
    if re.search(URGENCY_WORD_RE, msg, re.I) and not re.search(r"сумм", msg):
        return bool(
            SUM_LABELED_PATTERN.search(message)
            or AMOUNT_ONLY_PATTERN.match(message.strip())
        )
    return bool(
        SUM_LABELED_PATTERN.search(message)
        or AMOUNT_ONLY_PATTERN.match(message.strip())
        or (
            re.search(r"сумм|amount|руб|byn|на\s+сумму", msg)
            and AMOUNT_PATTERN.search(message)
        )
    )


def _parse_urgency_value(text: str) -> Optional[str]:
    raw = text.strip()
    if not raw:
        return None
    m = re.search(
        rf"{URGENCY_WORD_RE}\w*(?:\s+платеж\w*)?\s*[:—-]?\s*(\d{{1,2}})",
        raw,
        re.I,
    )
    if m:
        return m.group(1)
    only_digit = re.match(r"^\s*(\d{1,2})\s*$", raw)
    if only_digit:
        return only_digit.group(1)
    word_digits = (
        ("шест", "6"),
        ("пят", "5"),
        ("четверт", "4"),
        ("трет", "3"),
        ("втор", "2"),
        ("перв", "1"),
    )
    lower = raw.lower()
    if re.search(URGENCY_WORD_RE, lower, re.I):
        for stem, digit in word_digits:
            if stem in lower:
                return digit
    return None


def _field_value_boundary() -> str:
    return r"(?=\s*,\s*|\s+(?:назначени|получател|контрагент|номер|дата|очеред|сумм)|$)"


def _could_be_field_value(message: str) -> bool:
    text = message.strip()
    if not text or len(text) > 500:
        return False
    if AMOUNT_ONLY_PATTERN.match(text):
        return True
    if DATE_PATTERN.search(text):
        return True
    if len(text.split()) <= 12:
        return True
    return False


def _get_form_session(session_id: str, form_type: str) -> _FormFillState:
    raw = _FORM_FILL_SESSIONS.get(session_id)
    if raw and raw.get("form_type") == form_type:
        return _FormFillState(
            form_type=form_type,
            filled=dict(raw.get("filled") or {}),
            pending_key=raw.get("pending_key"),
            active=bool(raw.get("active")),
        )
    state = _FormFillState(form_type=form_type, active=False)
    return state


def _save_form_session(session_id: str, state: _FormFillState) -> None:
    _FORM_FILL_SESSIONS[session_id] = {
        "form_type": state.form_type,
        "filled": dict(state.filled),
        "pending_key": state.pending_key,
        "active": state.active,
    }


def _missing_field_keys(schema: dict, filled_names: set[str]) -> List[str]:
    missing: List[str] = []
    for f in fillable_fields(schema):
        if f["name"] not in filled_names:
            missing.append(f["key"])
    return missing


def _validate_form_actions(
    actions: Optional[List[FormFieldAction]], schema: dict
) -> Optional[List[FormFieldAction]]:
    if not actions:
        return None

    by_name = {f["name"]: f for f in schema.get("fields", [])}
    validated: List[FormFieldAction] = []

    for action in actions:
        if not action.value or not str(action.value).strip():
            continue
        field_meta = by_name.get(action.field)
        if not field_meta:
            continue
        if field_meta.get("type") in ("radio", "checkbox") and not action.value.isdigit():
            continue
        validated.append(
            FormFieldAction(
                field=action.field,
                value=str(action.value).strip(),
                label=action.label or field_meta.get("label"),
            )
        )

    return validated or None


def _parse_pending_value(
    message: str, pending_key: str, schema: dict
) -> Optional[FormFieldAction]:
    meta = field_by_key(schema, pending_key)
    if not meta:
        return None

    text = message.strip()
    if pending_key == "COMMON_COLUMNS_AMOUNT":
        m = AMOUNT_ONLY_PATTERN.match(text) or AMOUNT_PATTERN.search(text)
        if m:
            return FormFieldAction(
                field=meta["name"],
                value=m.group(1).replace(",", "."),
                label=meta.get("label"),
            )

    if pending_key == "COMMON_COLUMNS_DOC_DATE":
        m = DATE_PATTERN.search(text)
        if m:
            d, mo, y = m.groups()
            y = y if len(y) == 4 else f"20{y}"
            return FormFieldAction(
                field=meta["name"],
                value=f"{d.zfill(2)}.{mo.zfill(2)}.{y}",
                label=meta.get("label"),
            )

    if pending_key == "COMMON_COLUMNS_DOC_NUMBER":
        m = re.match(r"^\s*(\d+)\s*$", text)
        if m:
            return FormFieldAction(field=meta["name"], value=m.group(1), label=meta.get("label"))

    if pending_key == "PAYMENT_URGENCY":
        urgency_val = _parse_urgency_value(text)
        if urgency_val:
            return FormFieldAction(
                field=meta["name"], value=urgency_val, label=meta.get("label")
            )

    if pending_key == "PAYMENT_PURPOSE":
        value = re.sub(
            r"^назначени[ея]\s*(?:платеж\w*|оплаты?)?\s*[:—-]?\s*",
            "",
            text,
            flags=re.I,
        ).strip()
        if len(value) >= 2:
            return FormFieldAction(field=meta["name"], value=value.rstrip(".,;"), label=meta.get("label"))

    if pending_key in ("CONTRAGENT_ID", "CONTRAGENT_ACCOUNT"):
        if len(text) >= 2 and not re.match(
            r"^(сумм|номер|дата|очеред|заполн|помог)", text, re.I
        ):
            return FormFieldAction(field=meta["name"], value=text.rstrip(".,;"), label=meta.get("label"))

    return None


async def _enrich_counterparty_from_db(
    db,
    org_id: str,
    actions: List[FormFieldAction],
    schema: dict,
    filled: Dict[str, str],
) -> List[FormFieldAction]:
    """Подставить УНП и счёт из PostgreSQL, если указан контрагент."""
    fields = {f["key"]: f for f in schema.get("fields", [])}
    extra: List[FormFieldAction] = []
    recipient_value: str | None = None

    for a in actions:
        meta = next((f for f in schema.get("fields", []) if f["name"] == a.field), None)
        if meta and meta.get("key") == "CONTRAGENT_ID":
            recipient_value = a.value
            break

    if not recipient_value:
        c_field = fields.get("CONTRAGENT_ID")
        if c_field:
            recipient_value = filled.get(c_field["name"], "")

    if not recipient_value:
        return actions

    row = await lookup_counterparty(db, org_id, recipient_value)
    if not row:
        return actions

    for key, attr in (("CONTRAGENT_UNP", "unp"), ("CONTRAGENT_ACCOUNT", "account")):
        fld = fields.get(key)
        if not fld or not getattr(row, attr, ""):
            continue
        if filled.get(fld["name"]) or any(a.field == fld["name"] for a in actions):
            continue
        extra.append(
            FormFieldAction(
                field=fld["name"],
                value=getattr(row, attr),
                label=fld.get("label"),
            )
        )

    if extra:
        actions = actions + extra
        for a in extra:
            filled[a.field] = a.value
    return actions


def _rule_based_form_fill(
    message: str,
    form_type: str,
    *,
    pending_key: Optional[str] = None,
) -> Optional[List[FormFieldAction]]:
    schema = load_form_schema(form_type)
    if not schema:
        return None

    if pending_key:
        pending_action = _parse_pending_value(message, pending_key, schema)
        if pending_action:
            return [pending_action]

    msg = message.lower()
    actions: List[FormFieldAction] = []
    fields = schema.get("fields", [])

    amount_match = (
        SUM_LABELED_PATTERN.search(message)
        or AMOUNT_ONLY_PATTERN.match(message.strip())
        or AMOUNT_PATTERN.search(message)
    )
    if amount_match and _message_mentions_amount(message):
        field = next((f for f in fields if f["key"] == "COMMON_COLUMNS_AMOUNT"), None)
        if field:
            actions.append(
                FormFieldAction(
                    field=field["name"],
                    value=amount_match.group(1).replace(",", "."),
                    label=field.get("label"),
                )
            )

    date_match = DATE_PATTERN.search(message)
    if date_match and (
        any(w in msg for w in ["дата", "date"]) or pending_key == "COMMON_COLUMNS_DOC_DATE"
    ):
        d, mo, y = date_match.groups()
        y = y if len(y) == 4 else f"20{y}"
        field = next((f for f in fields if f["key"] == "COMMON_COLUMNS_DOC_DATE"), None)
        if field:
            actions.append(
                FormFieldAction(
                    field=field["name"],
                    value=f"{d.zfill(2)}.{mo.zfill(2)}.{y}",
                    label=field.get("label"),
                )
            )

    doc_num = re.search(
        r"(?:номер|№)\s*(?:документ\w*)?\s*[:№]?\s*(\d+)|документ\s*(?:№|номер)?\s*(\d+)",
        msg,
    )
    if doc_num:
        num = doc_num.group(1) or doc_num.group(2)
        field = next((f for f in fields if f["key"] == "COMMON_COLUMNS_DOC_NUMBER"), None)
        if field:
            actions.append(
                FormFieldAction(field=field["name"], value=num, label=field.get("label"))
            )

    purpose = re.search(
        r"назначени[ея]\s*(?:платеж\w*|оплаты?)?\s*[:—-]?\s*(.+?)(?:,\s*(?:номер|№|дата|очеред|сумм)|$)",
        message,
        re.I,
    )
    if not purpose:
        purpose = re.search(
            r"назначени[ея]\s+(.+?)(?:,\s*(?:номер|№|дата|очеред|сумм)|$)",
            message,
            re.I,
        )
    if not purpose:
        purpose = re.search(r"^оплат[аы]\s+(.+)$", message, re.I)
    if purpose:
        field = next((f for f in fields if f["key"] == "PAYMENT_PURPOSE"), None)
        if field:
            actions.append(
                FormFieldAction(
                    field=field["name"],
                    value=purpose.group(1).strip().rstrip(".,;"),
                    label=field.get("label"),
                )
            )

    recipient = re.search(
        r"получател\w*\s*[:—-]?\s*(.+)$|контрагент\w*\s*[:—-]?\s*(.+)$",
        message,
        re.I,
    )
    if recipient:
        value = (recipient.group(1) or recipient.group(2) or "").strip().rstrip(".,;")
        field = next((f for f in fields if f["key"] == "CONTRAGENT_ID"), None)
        if field and value:
            actions.append(
                FormFieldAction(field=field["name"], value=value, label=field.get("label"))
            )

    urgency_val = _parse_urgency_value(message)
    if urgency_val:
        field = next((f for f in fields if f["key"] == "PAYMENT_URGENCY"), None)
        if field:
            actions.append(
                FormFieldAction(
                    field=field["name"],
                    value=urgency_val,
                    label=field.get("label"),
                )
            )

    account = re.search(
        r"(?:сч[её]т\s+получател\w*|iban)\s*[:—-]?\s*([A-Za-z0-9]+)",
        message,
        re.I,
    )
    if account:
        field = next((f for f in fields if f["key"] == "CONTRAGENT_ACCOUNT"), None)
        if field:
            actions.append(
                FormFieldAction(
                    field=field["name"],
                    value=account.group(1).strip(),
                    label=field.get("label"),
                )
            )

    boundary = _field_value_boundary()
    for fld in fields:
        for alias in fld.get("aliases", []) + [fld.get("label", "")]:
            if not alias or fld.get("key") in ("PAYMENT_INDICATION",):
                continue
            alias_l = alias.lower()
            m = re.search(
                rf"{re.escape(alias_l)}\s*[:—-]?\s*(.+?){boundary}",
                message,
                re.I,
            )
            if m:
                actions.append(
                    FormFieldAction(
                        field=fld["name"],
                        value=m.group(1).strip().rstrip(".,;"),
                        label=fld.get("label"),
                    )
                )
                break

    seen: set[str] = set()
    unique: List[FormFieldAction] = []
    for a in actions:
        if a.field not in seen:
            seen.add(a.field)
            unique.append(a)
    return unique or None


def _parse_bare_segment(part: str, schema: dict) -> Optional[List[FormFieldAction]]:
    """Parse a single comma-separated segment with loose rules."""
    text = part.strip()
    if not text:
        return None

    fields = schema.get("fields", [])
    actions: List[FormFieldAction] = []

    recipient = re.match(
        r"^(?:получател\w*|контрагент\w*)\s*[:—-]?\s*(.+)$",
        text,
        re.I,
    )
    if recipient:
        value = recipient.group(1).strip().rstrip(".,;")
        field = next((f for f in fields if f["key"] == "CONTRAGENT_ID"), None)
        if field and len(value) >= 2:
            return [
                FormFieldAction(field=field["name"], value=value, label=field.get("label"))
            ]

    amount_labeled = re.match(
        r"^сумм\w*\s*[:—-]?\s*(\d+(?:[.,]\d+)?)\s*(?:руб|byn|р\.?)?\s*$",
        text,
        re.I,
    )
    if amount_labeled:
        field = next((f for f in fields if f["key"] == "COMMON_COLUMNS_AMOUNT"), None)
        if field:
            return [
                FormFieldAction(
                    field=field["name"],
                    value=amount_labeled.group(1).replace(",", "."),
                    label=field.get("label"),
                )
            ]

    urgency_part = _parse_urgency_value(text)
    if urgency_part:
        field = next((f for f in fields if f["key"] == "PAYMENT_URGENCY"), None)
        if field:
            return [
                FormFieldAction(
                    field=field["name"],
                    value=urgency_part,
                    label=field.get("label"),
                )
            ]

    amount_only = re.match(r"^\s*(\d+(?:[.,]\d+)?)\s*(?:руб|byn|р\.?)?\s*$", text, re.I)
    if amount_only and not re.search(URGENCY_WORD_RE, text, re.I):
        field = next((f for f in fields if f["key"] == "COMMON_COLUMNS_AMOUNT"), None)
        if field:
            return [
                FormFieldAction(
                    field=field["name"],
                    value=amount_only.group(1).replace(",", "."),
                    label=field.get("label"),
                )
            ]

    purpose_value: Optional[str] = None
    if re.search(r"^назначени", text, re.I):
        purpose_value = re.sub(
            r"^назначени[ея]\s*(?:платеж\w*|оплаты?)?\s*[:—-]?\s*",
            "",
            text,
            flags=re.I,
        ).strip()
    elif re.search(r"^(?:оплат\w+|перевод)\s+", text, re.I):
        purpose_value = text.strip()
    elif re.search(r"[а-яёa-z]", text, re.I) and not re.match(r"^\s*\d", text):
        purpose_value = text.strip()

    if purpose_value and len(purpose_value) >= 2:
        field = next((f for f in fields if f["key"] == "PAYMENT_PURPOSE"), None)
        if field:
            return [
                FormFieldAction(
                    field=field["name"],
                    value=purpose_value.rstrip(".,;"),
                    label=field.get("label"),
                )
            ]

    return actions or None


def _merge_form_fill_parsing(
    message: str,
    form_type: str,
    *,
    pending_key: Optional[str] = None,
) -> Optional[List[FormFieldAction]]:
    if pending_key and not _is_multi_field_message(message):
        return _rule_based_form_fill(message, form_type, pending_key=pending_key)

    schema = load_form_schema(form_type)
    if not schema:
        return None

    whole = _rule_based_form_fill(message, form_type)
    parts = [p.strip() for p in re.split(r"[,;\n]+", message) if p.strip()]
    if len(parts) <= 1:
        return whole

    merged: Dict[str, FormFieldAction] = {}
    if whole:
        for action in whole:
            merged[action.field] = action

    for part in parts:
        parsed = _rule_based_form_fill(part, form_type)
        if not parsed:
            parsed = _parse_bare_segment(part, schema)
        if parsed:
            for action in parsed:
                merged[action.field] = action

    return list(merged.values()) or None


class AssistantService:
    def __init__(self):
        self.nav = NavigationService()
        self.products = ProductService()
        self._openai_available = bool(settings.OPENAI_API_KEY)

    async def process(
        self,
        message: str,
        session_id: Optional[str],
        user_id: str,
        page_route: Optional[str] = None,
        form_type: Optional[str] = None,
        org_id: Optional[str] = None,
    ) -> AssistantResponse:
        if not session_id:
            session_id = str(uuid.uuid4())
        effective_org = org_id or "demo"

        if _is_greeting_or_empty(message):
            return await self._build_welcome(session_id, effective_org, page_route)

        if is_navigation_message(message):
            demo_nav = self._maybe_demo_navigation(message, session_id)
            if demo_nav:
                return demo_nav

        page_ui = handle_page_ui_action(message, session_id, page_route)
        if page_ui:
            return page_ui

        banking_reply = await self._maybe_banking_query(message, session_id, effective_org)
        if banking_reply:
            return banking_reply

        async with AsyncSessionLocal() as db:
            onec_reply = await handle_onec_query(db, message, session_id, effective_org)
        if onec_reply:
            return onec_reply

        tax_salary = self._maybe_tax_salary_chain(message, session_id)
        if tax_salary:
            return tax_salary

        service_reply = await self._maybe_service_consultation(message, session_id)
        if service_reply:
            return service_reply

        if form_type:
            form_reply = await self._handle_payment_form_chat(message, form_type, session_id, effective_org)
            if form_reply is not None:
                return form_reply

        insurance_reply = self._maybe_insurance_reply(message, session_id)
        if insurance_reply:
            return insurance_reply

        if self._openai_available:
            try:
                return await self._process_openai(message, session_id, form_type=form_type)
            except Exception as exc:
                logger.exception("LLM request failed, using rule-based fallback: %s", exc)

        return await self._process_rules(message, session_id)

    async def _handle_payment_form_chat(
        self, message: str, form_type: str, session_id: str, org_id: str = "demo"
    ) -> Optional[AssistantResponse]:
        schema = load_form_schema(form_type)
        if not schema:
            return None

        if is_navigation_message(message):
            return None

        state = _get_form_session(session_id, form_type)
        engage = (
            _wants_form_fill_help(message)
            or _looks_like_form_fill(message)
            or (
                state.active
                and state.pending_key
                and _could_be_field_value(message)
            )
        )
        if not engage:
            return None

        state.active = True
        pending_before = state.pending_key
        if _is_multi_field_message(message):
            state.pending_key = None
        parsed = _merge_form_fill_parsing(
            message, form_type, pending_key=state.pending_key
        )

        help_only = _wants_form_fill_help(message) and not parsed and not state.filled
        if help_only:
            missing_keys = _missing_field_keys(schema, set(state.filled.keys()))
            state.pending_key = missing_keys[0] if missing_keys else None
            _save_form_session(session_id, state)
            pending_labels = field_labels_for_keys(schema, missing_keys)
            title = schema.get("title", form_type)
            ask = ", ".join(pending_labels[:6])
            next_meta = field_by_key(schema, missing_keys[0]) if missing_keys else None
            next_label = (next_meta or {}).get("label", "")
            msg = (
                f"Помогу заполнить «{title}». Укажите: {ask}.\n\n"
                "Можно одним сообщением, например: «Сумма 1500, назначение — оплата аренды»."
            )
            if next_label:
                msg += f"\n\nНачнём с поля «{next_label}»."
            return AssistantResponse(
                message=msg,
                session_id=session_id,
                pending_form_fields=pending_labels or None,
                form_fill_status="collecting",
            )

        if (
            not parsed
            and self._openai_available
            and _looks_like_form_fill(message)
            and not _wants_form_fill_help(message)
        ):
            try:
                llm_actions = await self._llm_form_fill(message, schema)
                parsed = _validate_form_actions(llm_actions, schema)
            except Exception as exc:
                logger.exception("LLM form fill failed, using rules: %s", exc)

        by_name = {f["name"]: f for f in schema.get("fields", [])}
        new_actions: List[FormFieldAction] = []

        if parsed:
            for a in parsed:
                if not a.value or not str(a.value).strip():
                    continue
                meta = by_name.get(a.field)
                if not meta:
                    continue
                action = FormFieldAction(
                    field=a.field,
                    value=str(a.value).strip(),
                    label=a.label or meta.get("label"),
                )
                if state.filled.get(a.field) != action.value:
                    state.filled[a.field] = action.value
                    new_actions.append(action)

        filled_names = set(state.filled.keys())
        missing_keys = _missing_field_keys(schema, filled_names)
        pending_labels = field_labels_for_keys(schema, missing_keys)

        if missing_keys:
            state.pending_key = missing_keys[0]
        else:
            state.pending_key = None

        _save_form_session(session_id, state)

        title = schema.get("title", form_type)

        if new_actions:
            async with AsyncSessionLocal() as _db:
                before_fields = {a.field for a in new_actions}
                new_actions = await _enrich_counterparty_from_db(
                    _db, org_id, new_actions, schema, state.filled
                )
                for a in new_actions:
                    if a.field not in before_fields:
                        state.filled[a.field] = a.value
            filled_names = set(state.filled.keys())
            missing_keys = _missing_field_keys(schema, filled_names)
            pending_labels = field_labels_for_keys(schema, missing_keys)
            if missing_keys:
                state.pending_key = missing_keys[0]
            else:
                state.pending_key = None
            _save_form_session(session_id, state)

            filled_labels = ", ".join(
                a.label or a.field.split(".")[-1] for a in new_actions
            )
            if missing_keys:
                next_meta = field_by_key(schema, missing_keys[0])
                next_label = (next_meta or {}).get("label", missing_keys[0])
                msg = (
                    f"Заполнено: {filled_labels}.\n\n"
                    f"Укажите «{next_label}»"
                    + (
                        f" (или ещё: {', '.join(pending_labels[1:3])})."
                        if len(pending_labels) > 1
                        else "."
                    )
                )
                status = "partial"
            else:
                msg = f"Готово — заполнены все основные поля: {filled_labels}."
                status = "complete"
            daily_limit = 5000.0
            async with AsyncSessionLocal() as _db:
                org_profile = await get_org_profile(_db, org_id)
                daily_limit = getattr(org_profile, "daily_payment_limit", 5000.0) or 5000.0
            hint_block = _payment_hints_from_state(state.filled, daily_limit=daily_limit)
            if hint_block:
                msg += f"\n\n**Проверки:**\n{hint_block}"
            if any(a.field not in before_fields for a in new_actions):
                msg += "\n\n_УНП и счёт получателя подставлены из справочника контрагентов (PostgreSQL)._"
            return AssistantResponse(
                message=msg,
                session_id=session_id,
                form_actions=new_actions,
                pending_form_fields=pending_labels or None,
                form_fill_status=status,
            )

        if pending_before and missing_keys:
            next_meta = field_by_key(schema, missing_keys[0])
            next_label = (next_meta or {}).get("label", missing_keys[0])
            return AssistantResponse(
                message=(
                    f"Не распознал значение. Укажите «{next_label}» "
                    f"(например: число для суммы или текст назначения)."
                ),
                session_id=session_id,
                pending_form_fields=pending_labels or None,
                form_fill_status="collecting",
            )

        if state.filled and not missing_keys:
            return AssistantResponse(
                message=f"Форма «{title}» уже заполнена по нашим данным. Можете проверить поля на экране.",
                session_id=session_id,
                form_fill_status="complete",
            )

        return None

    async def _llm_form_fill(self, message: str, schema: dict) -> Optional[List[FormFieldAction]]:
        client = self._llm_client()
        field_summary = schema_field_summary(schema)

        TOOLS = [
            {
                "type": "function",
                "function": {
                    "name": "fill_payment_form",
                    "description": "Заполнить поля платёжной формы SBBOL по запросу пользователя",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "fields": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "field": {"type": "string", "description": "DOM name атрибут поля"},
                                        "value": {"type": "string"},
                                        "label": {"type": "string"},
                                    },
                                    "required": ["field", "value"],
                                },
                            },
                        },
                        "required": ["fields"],
                    },
                },
            }
        ]

        system = (
            "Ты помощник банка SBBOL. Пользователь просит заполнить платёжную форму на русском языке. "
            "Используй только поля из схемы — атрибут name должен совпадать точно. "
            "Для суммы используй число без валюты. Для назначения платежа — полный текст назначения. "
            "Верни fill_payment_form с корректными name, value и label из схемы.\n\n"
            f"{field_summary}"
        )

        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": message},
            ],
            tools=TOOLS,
            tool_choice={"type": "function", "function": {"name": "fill_payment_form"}},
        )

        ai_msg = resp.choices[0].message
        if not ai_msg.tool_calls:
            return None

        args = json.loads(ai_msg.tool_calls[0].function.arguments)
        return [
            FormFieldAction(field=f["field"], value=str(f["value"]), label=f.get("label"))
            for f in args.get("fields", [])
        ]

    def _maybe_demo_navigation(
        self, message: str, session_id: str
    ) -> Optional[AssistantResponse]:
        route = match_demo_route(message)
        if not route:
            return None

        label = DEMO_ROUTE_LABELS.get(route, route)
        nav_path = build_demo_nav_path(route)
        if route == "/payments" and is_create_document_request(message):
            msg = (
                "Открываю раздел «Расчёты». Нажмите «Создать документ» на странице "
                "или выберите тип платежа в чате."
            )
        else:
            msg = f"Открываю раздел «{label}» в демо интернет-банка."
        return AssistantResponse(
            message=msg,
            session_id=session_id,
            navigation_path=nav_path,
            action_buttons=[
                ActionButton(
                    label=f"Перейти: {label}",
                    url=route,
                    variant="primary",
                ),
            ],
        )

    async def _build_welcome(
        self, session_id: str, org_id: str = "demo", page_route: Optional[str] = None
    ) -> AssistantResponse:
        from sqlalchemy import select
        from db.models import SmartNotification

        async with AsyncSessionLocal() as session:
            org = await get_org_profile(session, org_id)
            notif_result = await session.execute(
                select(SmartNotification)
                .where(SmartNotification.org_id == org_id, SmartNotification.is_read == False)
                .limit(3)
            )
            notifs = notif_result.scalars().all()

        page_hint = get_page_help(page_route) if page_route else ""
        msg = (
            f"Здравствуйте, {org.org_name}! Я консультант по СберБизнес — "
            "помогу с расчётами, выписками, зарплатой и сервисами. "
            "Могу нажимать кнопки и заполнять формы на текущей странице."
        )
        if page_hint:
            msg += f"\n\n{page_hint}"
        if notifs:
            msg += f"\n\nУ вас {len(notifs)} активных напоминаний — смотрите карточку выше в чате."

        role_chips: dict[str, tuple[str, str, str | None, str | None]] = {
            "businessman": ("Проверить остаток", "Платёжное поручение", None, "/payments/paydocbyn"),
            "accountant": ("Выписка по счёту", "Обязательства ФСЗН", "/statement/account", "/salary/obligations"),
            "ip": ("Сколько на счёте", "Мгновенный платёж", None, "/payments/instant"),
        }
        primary_msg, secondary_msg, primary_url, secondary_url = role_chips.get(
            org.user_role, role_chips["businessman"]
        )

        buttons = [
            ActionButton(
                label=primary_msg,
                message=None if primary_url else "Сколько на счёте?",
                url=primary_url,
                variant="primary",
            ),
            ActionButton(
                label=secondary_msg,
                url=secondary_url or "/payments/paydocbyn",
                variant="secondary",
            ),
            ActionButton(label="Умный поиск", message="Найди платежи Иванова за март", variant="secondary"),
        ]
        buttons.extend(get_page_quick_actions(page_route)[:2])

        return AssistantResponse(message=msg, session_id=session_id, action_buttons=buttons)

    async def _maybe_banking_query(
        self, message: str, session_id: str, org_id: str = "demo"
    ) -> Optional[AssistantResponse]:
        async with AsyncSessionLocal() as session:
            result = await handle_banking_query(session, message, org_id=org_id)
        if not result:
            return None
        return AssistantResponse(
            message=result["message"],
            session_id=session_id,
            sources=[SourceRef(**s) for s in result.get("sources", [])],
            action_buttons=[ActionButton(**b) for b in result.get("action_buttons", [])],
            charts=[ChartSpec(**c) for c in result.get("charts", [])] or None,
            pending_form_fields=result.get("pending_form_fields"),
        )

    def _maybe_tax_salary_chain(
        self, message: str, session_id: str
    ) -> Optional[AssistantResponse]:
        low = message.lower()
        if not (re.search(r"зарплат", low) and re.search(r"фсзн|соц|страхов", low)):
            return None
        return AssistantResponse(
            message=(
                "Для выплаты зарплаты и перечисления в ФСЗН:\n"
                "1. Подготовьте ведомость в разделе «Зарплата».\n"
                "2. Сформируйте платёж по обязательствам (ФСЗН, подоходный налог).\n"
                "3. Проверьте сроки в календаре обязательств."
            ),
            session_id=session_id,
            navigation_path=self.nav.get_path("salary"),
            action_buttons=[
                ActionButton(label="Зарплатный проект", url="/salary", variant="primary"),
                ActionButton(label="Обязательства", url="/salary/obligations", variant="secondary"),
                ActionButton(label="Создать платёж ФСЗН", message="Создай платёж на ФСЗН", variant="secondary"),
            ],
        )

    async def _maybe_service_consultation(
        self, message: str, session_id: str
    ) -> Optional[AssistantResponse]:
        low = message.lower()
        if not re.search(r"сервис|эквайринг|тариф|подключ|аналитик|зарплатн\w*\s+проект", low):
            return None
        async with AsyncSessionLocal() as session:
            svc = await find_service(session, message)
        if not svc:
            return None
        text, buttons = format_service_reply(svc)
        return AssistantResponse(
            message=text,
            session_id=session_id,
            action_buttons=[ActionButton(**b) for b in buttons],
            sources=[
                SourceRef(index=1, label=f"Источник 1: Каталог — {svc.name}", kind="service", url=svc.connect_url)
            ],
        )

    def _maybe_insurance_reply(
        self, message: str, session_id: str
    ) -> Optional[AssistantResponse]:
        intent_cfg = _detect_intent(message)
        if not intent_cfg or "страхов" not in message.lower():
            return None
        return AssistantResponse(
            message=insurance_clarify_message(),
            session_id=session_id,
            navigation_path=self.nav.get_path("products"),
            action_buttons=[
                ActionButton(
                    label=b["label"],
                    message=b["message"],
                    variant=b.get("variant", "secondary"),
                )
                for b in insurance_clarify_buttons()
            ],
        )

    async def _process_rules(self, message: str, session_id: str) -> AssistantResponse:
        intent_cfg = _detect_intent(message)
        max_rate = _extract_max_rate(message)

        if not intent_cfg:
            return await self._build_welcome(session_id, "demo")

        intent = intent_cfg["intent"]
        section = intent_cfg["section"]
        product_type = intent_cfg["product_type"]

        nav_path = self.nav.get_path(section)

        products: List[BankProduct] = []
        if product_type:
            raw = await self.products.search({
                "product_type": product_type,
                "max_rate": max_rate,
            })
            products = _external_products(raw[:3])

        buttons = [
            ActionButton(
                label=f"Открыть: {section_label(section)}",
                url=sanitize_url(section_url(section)),
                variant="primary",
            ),
        ]
        if products:
            buttons.append(
                ActionButton(
                    label="Все продукты раздела",
                    url=sanitize_url(catalog_url(product_type)),
                    variant="secondary",
                )
            )

        return AssistantResponse(
            message=sanitize_message_urls(response_message(intent)),
            session_id=session_id,
            navigation_path=nav_path,
            products=products if products else None,
            action_buttons=buttons,
        )

    def _llm_client(self):
        from openai import AsyncOpenAI

        kwargs: dict = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            kwargs["base_url"] = settings.OPENAI_BASE_URL

        headers: dict[str, str] = {}
        if settings.OPENROUTER_SITE_URL:
            headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
        if settings.OPENROUTER_APP_NAME:
            headers["X-Title"] = settings.OPENROUTER_APP_NAME
        if headers:
            kwargs["default_headers"] = headers

        return AsyncOpenAI(**kwargs)

    async def _process_openai(
        self, message: str, session_id: str, form_type: Optional[str] = None
    ) -> AssistantResponse:
        client = self._llm_client()

        TOOLS = [
            {
                "type": "function",
                "function": {
                    "name": "find_products",
                    "description": "Найти продукты СберБизнес для организации",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_type": {"type": "string", "enum": ["credit", "deposit", "investment"]},
                            "max_rate": {"type": "number"},
                        },
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "navigate",
                    "description": "Перейти в раздел SBBOL: payments, statement, salary, products, credits, deposits, cards, services, settings",
                    "parameters": {
                        "type": "object",
                        "properties": {"section": {"type": "string"}},
                        "required": ["section"],
                    },
                },
            },
        ]

        if form_type:
            schema = load_form_schema(form_type)
            if schema:
                TOOLS.append(
                    {
                        "type": "function",
                        "function": {
                            "name": "fill_payment_form",
                            "description": "Заполнить поля текущей платёжной формы SBBOL",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "fields": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "field": {"type": "string"},
                                                "value": {"type": "string"},
                                                "label": {"type": "string"},
                                            },
                                            "required": ["field", "value"],
                                        },
                                    },
                                },
                                "required": ["fields"],
                            },
                        },
                    }
                )

        system_prompt = SYSTEM_PROMPT
        if form_type:
            schema = load_form_schema(form_type)
            if schema:
                system_prompt += (
                    "\n\nПользователь на странице платёжной формы SBBOL. "
                    "Если просит заполнить поля — вызови fill_payment_form.\n"
                    + schema_field_summary(schema)
                )

        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            tools=TOOLS,
            tool_choice="auto",
        )

        ai_msg = resp.choices[0].message
        nav_path = None
        products = None
        buttons: List[ActionButton] = []
        form_actions: Optional[List[FormFieldAction]] = None
        last_section = "home"

        if ai_msg.tool_calls:
            for tc in ai_msg.tool_calls:
                args = json.loads(tc.function.arguments)
                if tc.function.name == "find_products":
                    raw = await self.products.search(args)
                    products = _external_products(raw[:3])
                    ptype = args.get("product_type")
                    buttons.append(
                        ActionButton(
                            label="Раздел в SBBOL",
                            url=catalog_url(ptype),
                            variant="secondary",
                        )
                    )
                elif tc.function.name == "navigate":
                    last_section = args["section"]
                    nav_path = self.nav.get_path(last_section)
                elif tc.function.name == "fill_payment_form":
                    form_actions = [
                        FormFieldAction(field=f["field"], value=str(f["value"]), label=f.get("label"))
                        for f in args.get("fields", [])
                    ]

        text = sanitize_message_urls(ai_msg.content or response_message("default"))
        if form_actions:
            filled = ", ".join(a.label or a.field.split(".")[-1] for a in form_actions)
            text = ai_msg.content or f"Заполняю поля: {filled}."
        elif not re.search(r"(^/\w|sbbol\.bps-sberbank)", text):
            text = f"{text}\n\n{format_link_line('Раздел СберБизнес', section_url(last_section))}"

        if not form_actions:
            buttons.insert(
                0,
                ActionButton(
                    label="Перейти в раздел",
                    url=sanitize_url(section_url(last_section)),
                    variant="primary",
                ),
            )

        return AssistantResponse(
            message=text,
            session_id=session_id,
            navigation_path=nav_path,
            products=products,
            action_buttons=buttons if buttons else None,
            form_actions=form_actions,
        )
