"""Аналитика из PostgreSQL для ассистента и API."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import AnalyticsMonthly, BankAccount, StatementLine


async def monthly_expenses(
    session: AsyncSession, org_id: str, month: str | None = None
) -> list[dict]:
    stmt = select(AnalyticsMonthly).where(AnalyticsMonthly.org_id == org_id)
    if month:
        stmt = stmt.where(AnalyticsMonthly.month == month)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    if not rows and month:
        stmt2 = select(AnalyticsMonthly).where(AnalyticsMonthly.org_id == org_id)
        result2 = await session.execute(stmt2)
        rows = result2.scalars().all()
    agg: dict[str, float] = {}
    for r in rows:
        agg[r.category] = agg.get(r.category, 0.0) + r.amount
    return [{"category": k, "amount": round(v, 2)} for k, v in sorted(agg.items(), key=lambda x: -x[1])]


async def compare_months(
    session: AsyncSession, org_id: str, month_a: str, month_b: str
) -> dict:
    async def _sum(month: str) -> float:
        result = await session.execute(
            select(AnalyticsMonthly).where(
                AnalyticsMonthly.org_id == org_id,
                AnalyticsMonthly.month == month,
            )
        )
        return sum(r.amount for r in result.scalars().all())

    return {
        "month_a": month_a,
        "amount_a": round(await _sum(month_a), 2),
        "month_b": month_b,
        "amount_b": round(await _sum(month_b), 2),
    }


async def cash_gap_forecast(session: AsyncSession, org_id: str) -> dict:
    acc = await session.execute(
        select(BankAccount).where(BankAccount.org_id == org_id, BankAccount.currency == "BYN")
    )
    accounts = acc.scalars().all()
    total = sum(a.balance for a in accounts)
    result = await session.execute(
        select(AnalyticsMonthly)
        .where(AnalyticsMonthly.org_id == org_id)
        .order_by(AnalyticsMonthly.month.desc())
        .limit(6)
    )
    monthly = result.scalars().all()
    avg_out = sum(m.amount for m in monthly) / max(len(monthly), 1)
    days_to_gap = int(total / max(avg_out / 30, 1)) if avg_out else 90
    return {
        "current_balance": round(total, 2),
        "avg_monthly_outflow": round(avg_out, 2),
        "days_to_gap": min(days_to_gap, 90),
        "forecast": [
            {"day": i * 7, "balance": round(max(0, total - (avg_out / 30) * i * 7), 2)}
            for i in range(5)
        ],
    }


def to_chart_pie(title: str, items: list[dict], currency: str = "BYN") -> dict:
    return {
        "type": "pie",
        "title": title,
        "labels": [i["category"] for i in items],
        "datasets": [{"label": currency, "data": [i["amount"] for i in items]}],
        "currency": currency,
    }


def to_chart_bar(title: str, labels: list[str], values: list[float], currency: str = "BYN") -> dict:
    return {
        "type": "bar",
        "title": title,
        "labels": labels,
        "datasets": [{"label": currency, "data": values}],
        "currency": currency,
    }


def to_chart_line(title: str, points: list[dict], currency: str = "BYN") -> dict:
    return {
        "type": "line",
        "title": title,
        "labels": [f"День {p['day']}" for p in points],
        "datasets": [{"label": f"Остаток {currency}", "data": [p["balance"] for p in points]}],
        "currency": currency,
    }
