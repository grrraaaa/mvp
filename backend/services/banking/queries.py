"""Запросы к банковским данным для ассистента."""
from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankAccount, BankDocument, OrganizationProfile
from services.banking.search import format_search_response, smart_search


async def get_org_profile(session: AsyncSession, org_id: str = "demo") -> OrganizationProfile:
    result = await session.execute(
        select(OrganizationProfile).where(OrganizationProfile.id == org_id)
    )
    row = result.scalar_one_or_none()
    if row:
        return row
    return OrganizationProfile(id="demo", org_name="DEMO ЮРИДИЧЕСКОЕ ЛИЦО", user_role="businessman")


async def get_balance_summary(session: AsyncSession, org_id: str = "demo") -> str:
    result = await session.execute(
        select(BankAccount).where(BankAccount.org_id == org_id, BankAccount.hidden == False)
    )
    accounts = result.scalars().all()
    byn = sum(a.balance for a in accounts if a.currency == "BYN")
    parts = [f"**{byn:,.2f} BYN** на расчётных счетах"]
    for cur in ("EUR", "USD", "RUB"):
        total = sum(a.balance for a in accounts if a.currency == cur)
        if total:
            parts.append(f"{total:,.2f} {cur}")
    return "Остаток по счетам: " + "; ".join(parts) + "."


def is_balance_query(message: str) -> bool:
    low = message.lower()
    return bool(
        re.search(
            r"сколько\s+(?:денег|средств)|остаток|баланс|на\s+счет",
            low,
        )
    )


def is_search_query(message: str) -> bool:
    low = message.lower()
    return bool(
        re.search(
            r"найди|найти|покажи|поиск|где\s+(?:платёж|платеж|документ|счёт|счет)|"
            r"карточк\w*\s+клиент|контрагент",
            low,
        )
    )


async def handle_banking_query(
    session: AsyncSession, message: str, org_id: str = "demo"
) -> dict | None:
    source_match = re.search(r"источник\s*№?\s*(\d+)", message.lower())
    if source_match:
        idx = int(source_match.group(1))
        result = await session.execute(
            select(BankDocument).where(BankDocument.org_id == org_id).limit(5)
        )
        docs = result.scalars().all()
        if docs and idx <= len(docs):
            doc = docs[idx - 1]
            return {
                "message": (
                    f"**Источник {idx}:** {doc.doc_number} от {doc.doc_date}\n"
                    f"Контрагент: {doc.counterparty}\n"
                    f"Сумма: {doc.amount} {doc.currency}\n"
                    f"Назначение: {doc.purpose}\n"
                    f"Статус: {doc.status}"
                ),
                "sources": [
                    {
                        "index": idx,
                        "label": f"Источник {idx}: {doc.doc_number}",
                        "kind": "document",
                        "id": doc.id,
                        "url": "/payments",
                    }
                ],
                "action_buttons": [
                    {"label": "Открыть расчёты", "url": "/payments", "variant": "primary"},
                ],
            }

    if is_balance_query(message):
        text = await get_balance_summary(session, org_id)
        return {
            "message": text,
            "sources": [{"index": 1, "label": "Источник 1: Выписка по счёту", "kind": "account", "url": "/"}],
            "action_buttons": [
                {"label": "Детализация счетов", "url": "/", "variant": "primary"},
                {"label": "Выписка", "url": "/statement", "variant": "secondary"},
                {"label": "Последние операции", "message": "Покажи последние документы", "variant": "secondary"},
            ],
        }

    if is_search_query(message):
        hits = await smart_search(session, message, org_id=org_id)
        text, sources = format_search_response(message, hits)
        buttons = []
        if hits:
            h = hits[0]
            if h.url:
                buttons.append({"label": "Открыть", "url": h.url, "variant": "primary"})
            if h.kind == "payment":
                buttons.append({"label": "Связанные платежи", "message": f"Платежи {h.title.split('—')[0]}", "variant": "secondary"})
        return {"message": text, "sources": sources, "action_buttons": buttons}

    low = message.lower()
    if re.search(r"расход\w*\s+по\s+категор", low):
        return {
            "message": (
                "Расходы по категориям за март 2026:\n"
                "• Поставщики — 42% (187 400 BYN)\n"
                "• Аренда — 35% (156 000 BYN)\n"
                "• Зарплата — 18% (80 200 BYN)\n"
                "• Прочее — 5% (22 300 BYN)"
            ),
            "sources": [
                {"index": 1, "label": "Источник 1: Бизнес-аналитика", "kind": "analytics", "url": "/services/analytics"}
            ],
            "action_buttons": [
                {"label": "Открыть аналитику", "url": "/services/analytics", "variant": "primary"},
                {"label": "Выписка", "url": "/statement", "variant": "secondary"},
            ],
        }

    if re.search(r"повтор\w*\s+последн|последн\w*\s+(?:платёж|платеж|документ)", low):
        result = await session.execute(
            select(BankDocument)
            .where(BankDocument.org_id == org_id)
            .order_by(BankDocument.doc_date.desc())
            .limit(1)
        )
        doc = result.scalars().first()
        if doc:
            return {
                "message": (
                    f"Последний документ: {doc.doc_number} от {doc.doc_date}, "
                    f"{doc.counterparty}, {doc.amount} {doc.currency} ({doc.status})."
                ),
                "sources": [{"index": 1, "label": f"Источник 1: {doc.doc_number}", "kind": "document", "url": "/payments"}],
                "action_buttons": [
                    {"label": "Повторить платёж", "message": f"Создай платёжку на {doc.amount} BYN для {doc.counterparty}", "variant": "primary"},
                    {"label": "Расчёты", "url": "/payments", "variant": "secondary"},
                ],
            }
    return None
