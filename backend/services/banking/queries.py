"""Запросы к банковским данным для ассистента."""
from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankAccount, BankDocument, Counterparty, OrganizationProfile
from services.banking.analytics import (
    cash_gap_forecast,
    compare_months,
    monthly_expenses,
    to_chart_bar,
    to_chart_line,
    to_chart_pie,
)
from services.banking.notifications import handle_notification_query, is_notification_query
from services.banking.search import format_search_response, smart_search


async def lookup_counterparty(
    session: AsyncSession, org_id: str, name: str
) -> Counterparty | None:
    """Найти контрагента организации в PostgreSQL по имени."""
    query = (name or "").strip()
    if len(query) < 2:
        return None
    result = await session.execute(
        select(Counterparty)
        .where(Counterparty.org_id == org_id, Counterparty.name.ilike(f"%{query}%"))
        .limit(1)
    )
    return result.scalar_one_or_none()


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
            r"карточк\w*\s+(?:клиент|контрагент)",
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

    if is_notification_query(message):
        notif_reply = await handle_notification_query(session, message, org_id)
        if notif_reply:
            return notif_reply

    low = message.lower()

    if re.search(r"расход|покажи\s+расход|структур\w*\s+расход", low):
        month_m = re.search(r"(20\d{2}-\d{2})", message)
        month = month_m.group(1) if month_m else None
        items = await monthly_expenses(session, org_id, month)
        if not items:
            return {
                "message": "За выбранный период расходов в базе нет. Укажите месяц, например: «расходы за 2026-03».",
                "pending_form_fields": ["Период (YYYY-MM)"],
                "action_buttons": [
                    {"label": "За март 2026", "message": "Расходы за 2026-03", "variant": "primary"},
                    {"label": "За июнь 2026", "message": "Расходы за 2026-06", "variant": "secondary"},
                ],
            }
        lines = "\n".join(f"• {i['category']} — {i['amount']:,.2f} BYN" for i in items[:8])
        return {
            "message": f"Расходы по категориям:\n{lines}",
            "charts": [to_chart_pie("Структура расходов", items)],
            "sources": [{"index": 1, "label": "Аналитика PostgreSQL", "kind": "analytics", "url": "/services"}],
            "action_buttons": [{"label": "Выписка", "url": "/statement", "variant": "secondary"}],
        }

    if re.search(r"сравни|сравнение", low) and re.search(r"феврал|март|апрел|май|июн", low):
        month_a, month_b = "2026-02", "2026-03"
        if "март" in low and "апрел" in low:
            month_a, month_b = "2026-03", "2026-04"
        elif "май" in low and "июн" in low:
            month_a, month_b = "2026-05", "2026-06"
        data = await compare_months(session, org_id, month_a, month_b)
        return {
            "message": (
                f"Сравнение расходов:\n"
                f"• {month_a}: **{data['amount_a']:,.2f} BYN**\n"
                f"• {month_b}: **{data['amount_b']:,.2f} BYN**"
            ),
            "charts": [to_chart_bar(f"{month_a} vs {month_b}", [month_a, month_b], [data["amount_a"], data["amount_b"]])],
            "sources": [{"index": 1, "label": "Аналитика PostgreSQL", "kind": "analytics", "url": "/services"}],
        }

    if re.search(r"кассов\w*\s+разрыв|прогноз\s+остат", low):
        data = await cash_gap_forecast(session, org_id)
        return {
            "message": (
                f"Текущий остаток BYN: **{data['current_balance']:,.2f}**\n"
                f"Средний месячный отток: {data['avg_monthly_outflow']:,.2f} BYN\n"
                f"Ориентировочно до дефицита: ~{data['days_to_gap']} дн."
            ),
            "charts": [to_chart_line("Прогноз остатка", data["forecast"])],
            "sources": [{"index": 1, "label": "Счета PostgreSQL", "kind": "account", "url": "/"}],
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

    if re.search(r"выписк", low) and re.search(r"сч[её]т|период|за\s+", low):
        missing = []
        if not re.search(r"сч[её]т|byn|usd|iban|by\d", low):
            missing.append("Счёт")
        if not re.search(r"сегодня|вчера|месяц|недел|квартал|год|20\d{2}", low):
            missing.append("Период")
        if missing:
            return {
                "message": f"Для выписки укажите: {', '.join(missing)}.",
                "pending_form_fields": missing,
                "action_buttons": [
                    {"label": "За месяц", "message": "Выписка за месяц", "variant": "primary"},
                    {"label": "За квартал", "message": "Выписка за квартал", "variant": "secondary"},
                    {"label": "За год", "message": "Выписка за год", "variant": "secondary"},
                    {"label": "За сегодня", "message": "Выписка за сегодня", "variant": "secondary"},
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
