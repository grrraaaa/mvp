"""Динамические уведомления на основе реальных данных из PostgreSQL.

В отличие от seed-уведомлений, эти пересобираются на каждый запрос к API —
всегда отражают текущее состояние БД: документы «На подписи», черновики
с близкой датой, реальный прогноз кассового разрыва.
"""
from __future__ import annotations

import re
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankAccount, BankDocument, SmartNotification
from services.banking.analytics import cash_gap_forecast
from services.banking.search import document_view_url

# Заголовки категорий, которые генерируются динамически — чтобы не дублировать
# статические seed-уведомления с теми же названиями.
DYNAMIC_TITLES = {
    "Документ на подписи",
    "Платёж поставщику",
    "Кассовый прогноз",
}


def _parse_doc_date(value: str | None) -> date | None:
    """Парсит дату документа в формате DD.MM.YYYY."""
    if not value:
        return None
    for fmt in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _format_amount(amount: float, currency: str) -> str:
    return f"{amount:,.2f} {currency}".replace(",", " ")


async def _signing_doc_notifications(
    session: AsyncSession, org_id: str
) -> list[SmartNotification]:
    """Один «Документ на подписи» на каждый BankDocument со статусом «На подписи»."""
    result = await session.execute(
        select(BankDocument).where(
            BankDocument.org_id == org_id,
            BankDocument.status == "На подписи",
        )
    )
    docs = result.scalars().all()
    notifs: list[SmartNotification] = []
    for d in docs:
        notifs.append(
            SmartNotification(
                id=f"dyn-signing-{d.id}",
                org_id=org_id,
                title="Документ на подписи",
                body=(
                    f"{d.doc_type} {d.doc_number} — {d.counterparty}, "
                    f"{_format_amount(d.amount, d.currency)} — ожидает подписи."
                ),
                severity="warn",
                category="document",
                action_url=document_view_url(d.id),
                action_label="Открыть",
                due_date=None,
                is_read=False,
            )
        )
    return notifs


async def _upcoming_payment_notifications(
    session: AsyncSession, org_id: str
) -> list[SmartNotification]:
    """Черновики и плановые платежи в ближайшие 7 дней — «Платёж поставщику»."""
    today = date.today()
    horizon = today + timedelta(days=7)
    result = await session.execute(
        select(BankDocument).where(BankDocument.org_id == org_id)
    )
    notifs: list[SmartNotification] = []
    for d in result.scalars().all():
        d_date = _parse_doc_date(d.doc_date)
        days_left: int | None = None
        if d_date:
            days_left = (d_date - today).days

        # Черновик с датой в будущем (в ближайшие 7 дней) — «подготовить платёж»
        if d.status == "Черновик" and d_date and today <= d_date <= horizon:
            notifs.append(
                SmartNotification(
                    id=f"dyn-draft-{d.id}",
                    org_id=org_id,
                    title="Платёж поставщику",
                    body=(
                        f"Через {days_left} дн. платёж {d.counterparty} — "
                        f"{_format_amount(d.amount, d.currency)}."
                    ),
                    severity="info",
                    category="payment",
                    action_url=document_view_url(d.id),
                    action_label="Подготовить платёж",
                    due_date=d.doc_date,
                    is_read=False,
                )
            )
            continue

        # «На подписи» с будущей датой — тоже «ожидается платёж»
        if d.status == "На подписи" and d_date and today <= d_date <= horizon:
            notifs.append(
                SmartNotification(
                    id=f"dyn-pending-{d.id}",
                    org_id=org_id,
                    title="Платёж поставщику",
                    body=(
                        f"Через {days_left} дн. запланирован платёж {d.counterparty} — "
                        f"{_format_amount(d.amount, d.currency)} (уже на подписи)."
                    ),
                    severity="info",
                    category="payment",
                    action_url=document_view_url(d.id),
                    action_label="Открыть",
                    due_date=d.doc_date,
                    is_read=False,
                )
            )
    return notifs


async def _cash_forecast_notification(
    session: AsyncSession, org_id: str
) -> list[SmartNotification]:
    """«Кассовый прогноз» — реальный days_to_gap из cash_gap_forecast."""
    forecast = await cash_gap_forecast(session, org_id)
    days = int(forecast.get("days_to_gap", 90))
    balance = float(forecast.get("current_balance", 0.0))
    avg = float(forecast.get("avg_monthly_outflow", 0.0))

    # Не показываем, если разрыв далеко или баланса с запасом
    if days >= 21 or balance <= 0:
        return []

    severity = "critical" if days < 7 else "warn"
    body = (
        f"Прогноз остатка показывает возможный дефицит через {days} дн. "
        f"Текущий остаток: {balance:,.2f} BYN, средний отток: {avg:,.2f} BYN/мес."
    ).replace(",", " ")
    due = (date.today() + timedelta(days=days)).strftime("%d.%m.%Y")
    return [
        SmartNotification(
            id=f"dyn-cashgap-{org_id}",
            org_id=org_id,
            title="Кассовый прогноз",
            body=body,
            severity=severity,
            category="analytics",
            action_url="/statement",
            action_label="Выписка",
            due_date=due,
            is_read=False,
        )
    ]


async def compute_dynamic_notifications(
    session: AsyncSession, org_id: str = "demo"
) -> list[SmartNotification]:
    """Собирает уведомления из реальных данных БД для организации.

    Источники: BankDocument (signing/draft/pending) + cash_gap_forecast (analytics).
    Вызывается на каждый GET /api/banking/notifications — никакого хардкода.
    """
    results: list[SmartNotification] = []
    results.extend(await _signing_doc_notifications(session, org_id))
    results.extend(await _upcoming_payment_notifications(session, org_id))
    results.extend(await _cash_forecast_notification(session, org_id))
    return results


def filter_static_notifications(
    rows: list[SmartNotification],
) -> list[SmartNotification]:
    """Убирает из seed-уведомлений те, что генерируются динамически.

    Если в БД лежит статичное «Документ на подписи» с захардкоженным
    №105 — не показываем его: реальный список даст compute_dynamic_notifications.
    """
    return [n for n in rows if n.title not in DYNAMIC_TITLES]
