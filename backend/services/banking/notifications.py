"""Запросы ассистента по умным напоминаниям из PostgreSQL."""
from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankDocument, SmartNotification
from services.banking.search import document_view_url

_DOC_NUM_RE = re.compile(r"№\s*(\d+)")


def is_notification_query(message: str) -> bool:
    low = message.lower()
    return bool(
        re.search(
            r"напоминани|уведомлен|что\s+за\s+(?:напоминани|уведомлен)|"
            r"расскаж\w*\s+про\s+(?:напоминани|уведомлен)|"
            r"про\s+напоминани|про\s+уведомлен|документ\s+на\s+подпис|"
            r"что\s+на\s+подпис|ожидает\s+подпис",
            low,
        )
    )


async def _find_doc_by_number(
    session: AsyncSession, org_id: str, doc_number: str
) -> BankDocument | None:
    digits = re.sub(r"\D", "", doc_number)
    if not digits:
        return None
    result = await session.execute(
        select(BankDocument).where(BankDocument.org_id == org_id)
    )
    for doc in result.scalars().all():
        if digits in re.sub(r"\D", "", doc.doc_number or ""):
            return doc
    return None


def _doc_action_url(doc: BankDocument | None, fallback: str | None) -> str:
    if doc and doc.status == "На подписи":
        return "/other/documents/signing"
    if doc:
        return document_view_url(doc.id)
    return fallback or "/payments"


async def resolve_notification_action_url(
    session: AsyncSession, org_id: str, notif: SmartNotification
) -> str:
    """Публичный URL действия для баннера / API (с привязкой к документу по № в тексте)."""
    doc = None
    m = _DOC_NUM_RE.search(notif.body or "")
    if m:
        doc = await _find_doc_by_number(session, org_id, m.group(1))
    return _doc_action_url(doc, notif.action_url)


async def _notification_buttons(
    session: AsyncSession, org_id: str, notif: SmartNotification
) -> list[dict]:
    doc = None
    m = _DOC_NUM_RE.search(notif.body or "")
    if m:
        doc = await _find_doc_by_number(session, org_id, m.group(1))
    url = _doc_action_url(doc, notif.action_url)
    label = notif.action_label or ("Открыть документ" if doc else "Перейти")
    return [{"label": label, "url": url, "variant": "primary"}]


def _match_notification(message: str, notifs: list[SmartNotification]) -> SmartNotification | None:
    low = message.lower()
    quoted = re.search(r"[«\"']([^»\"']+)[»\"']", message)
    if quoted:
        q = quoted.group(1).strip().lower()
        for n in notifs:
            if q in n.title.lower():
                return n

    for n in notifs:
        title_low = n.title.lower()
        if title_low in low:
            return n
        words = [w for w in re.split(r"\s+", title_low) if len(w) >= 5]
        if words and any(w in low for w in words):
            return n
    return None


async def handle_notification_query(
    session: AsyncSession, message: str, org_id: str = "demo"
) -> dict | None:
    if not is_notification_query(message):
        return None

    result = await session.execute(
        select(SmartNotification)
        .where(SmartNotification.org_id == org_id, SmartNotification.is_read == False)
        .order_by(SmartNotification.title)
    )
    notifs = result.scalars().all()
    if not notifs:
        return {
            "message": "Активных напоминаний нет — всё под контролем.",
            "action_buttons": [{"label": "Расчёты", "url": "/payments", "variant": "secondary"}],
        }

    matched = _match_notification(message, notifs)
    if matched:
        doc = None
        m = _DOC_NUM_RE.search(matched.body or "")
        if m:
            doc = await _find_doc_by_number(session, org_id, m.group(1))
        extra = ""
        if doc:
            extra = (
                f"\n\nСвязанный документ: **{doc.doc_number}** от {doc.doc_date}, "
                f"{doc.counterparty}, {doc.amount:,.2f} {doc.currency} — статус «{doc.status}»."
            )
        buttons = await _notification_buttons(session, org_id, matched)
        if doc and doc.status == "На подписи":
            buttons.append(
                {"label": "Создать похожий платёж", "url": "/payments/paydocbyn", "variant": "secondary"}
            )
        return {
            "message": f"**{matched.title}**\n{matched.body}{extra}",
            "action_buttons": buttons,
            "sources": [
                {
                    "index": 1,
                    "label": f"Напоминание: {matched.title}",
                    "kind": "notification",
                    "id": matched.id,
                    "url": buttons[0]["url"] if buttons else matched.action_url,
                }
            ],
        }

    lines = "\n".join(f"• **{n.title}** — {n.body}" for n in notifs[:6])
    buttons = []
    for n in notifs[:4]:
        btns = await _notification_buttons(session, org_id, n)
        if btns:
            buttons.append({**btns[0], "label": n.title[:28]})
    return {
        "message": f"У вас {len(notifs)} активных напоминаний:\n{lines}\n\nСпросите про конкретное, например: «Расскажи про «{notifs[0].title}»».",
        "action_buttons": buttons or [{"label": "Выписка", "url": "/statement", "variant": "secondary"}],
    }
