"""Повтор последнего платежа — мгновенный платёж с подстановкой реквизитов."""
from __future__ import annotations

import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankDocument
from models.schemas import FormFieldAction
from services.ai.form_schemas import load_form_schema
from services.banking.search import document_view_url
from services.forms.field_value_formats import normalize_field_value


def is_repeat_last_payment_query(message: str) -> bool:
    low = (message or "").strip().lower()
    if not low:
        return False
    if re.search(r"повтор\w*\s+последн", low):
        return True
    if re.search(r"повтор\w*", low) and re.search(r"плат[её]ж|документ|перевод", low):
        return True
    if re.search(r"как\s+(?:в\s+)?прошл\w*|такой\s+же\s+плат", low):
        return True
    return False


def _payment_documents_query(org_id: str):
    return (
        select(BankDocument)
        .where(BankDocument.org_id == org_id)
        .where(~BankDocument.doc_type.startswith("INFO:"))
        .order_by(BankDocument.doc_date.desc())
    )


async def _latest_payment_document(session: AsyncSession, org_id: str) -> BankDocument | None:
    result = await session.execute(_payment_documents_query(org_id).limit(1))
    return result.scalars().first()


def _instant_actions_from_document(doc: BankDocument) -> list[FormFieldAction]:
    schema = load_form_schema("instant") or {}
    by_key = {f["key"]: f for f in schema.get("fields", [])}
    actions: list[FormFieldAction] = []

    def add(key: str, raw: str | float | None) -> None:
        if raw is None:
            return
        val = str(raw).strip()
        if not val:
            return
        meta = by_key.get(key)
        if not meta:
            return
        if key == "COMMON_COLUMNS_AMOUNT":
            val = normalize_field_value(key, val) or val
        actions.append(
            FormFieldAction(
                field=meta["name"],
                value=val,
                label=meta.get("label"),
            )
        )

    add("COMMON_COLUMNS_AMOUNT", doc.amount)
    add("PAYMENT_PURPOSE", doc.purpose)
    add("CONTRAGENT_ID", doc.counterparty)
    if doc.doc_date:
        add("COMMON_COLUMNS_DOC_DATE", doc.doc_date)
    return actions


async def _enrich_instant_actions(
    session: AsyncSession,
    org_id: str,
    actions: list[FormFieldAction],
) -> list[FormFieldAction]:
    from services.banking.queries import lookup_counterparty

    schema = load_form_schema("instant") or {}
    by_key = {f["key"]: f for f in schema.get("fields", [])}
    recipient = next(
        (a.value for a in actions if a.field == by_key.get("CONTRAGENT_ID", {}).get("name")),
        "",
    )
    if not recipient:
        return actions

    row = await lookup_counterparty(session, org_id, recipient)
    if not row:
        return actions

    out = list(actions)
    names = {a.field for a in out}
    c_name = by_key.get("CONTRAGENT_ID", {}).get("name")
    if c_name and row.name:
        out = [
            FormFieldAction(field=a.field, value=row.name, label=a.label)
            if a.field == c_name
            else a
            for a in out
        ]

    for key, attr in (("CONTRAGENT_UNP", "unp"), ("CONTRAGENT_ACCOUNT", "account")):
        meta = by_key.get(key)
        val = getattr(row, attr, "") if row else ""
        if not meta or not val or meta["name"] in names:
            continue
        out.append(
            FormFieldAction(field=meta["name"], value=str(val), label=meta.get("label"))
        )
    return out


async def repeat_last_payment_reply(session: AsyncSession, org_id: str) -> dict[str, Any]:
    doc = await _latest_payment_document(session, org_id)
    if not doc:
        return {
            "message": (
                "Не нашёл проведённых платежей для повтора. "
                "Создайте первый платёж вручную или через чат."
            ),
            "action_buttons": [
                {"label": "Мгновенный платёж", "url": "/payments/instant", "variant": "primary"},
                {"label": "Платёжное поручение", "url": "/payments/paydocbyn", "variant": "secondary"},
            ],
        }

    actions = await _enrich_instant_actions(
        session, org_id, _instant_actions_from_document(doc)
    )
    filled = ", ".join(a.label or a.field.split(".")[-1] for a in actions[:4])

    return {
        "message": (
            f"Открываю **мгновенный платёж** и подставляю данные последнего документа "
            f"**{doc.doc_number}** от {doc.doc_date}:\n"
            f"• {doc.counterparty}\n"
            f"• {doc.amount:,.2f} {doc.currency}\n"
            f"• {doc.purpose or '—'}\n\n"
            f"Заполнено на форме: {filled}."
        ),
        "ui_actions": [{"type": "navigate", "target": "/payments/instant"}],
        "form_actions": [a.model_dump() for a in actions],
        "form_fill_status": "partial",
        "sources": [
            {
                "index": 1,
                "label": f"Источник 1: {doc.doc_number}",
                "kind": "payment",
                "id": doc.id,
                "url": document_view_url(doc.id),
            }
        ],
        "action_buttons": [
            {
                "label": "Проверить реквизиты",
                "message": "Проверь реквизиты платежа",
                "variant": "secondary",
            },
            {"label": "Открыть документ", "url": document_view_url(doc.id), "variant": "secondary"},
        ],
    }
