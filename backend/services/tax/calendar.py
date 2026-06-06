"""Tax calendar — deadlines and demo contribution amounts."""
from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import OrganizationProfile, TaxDeadline


async def get_tax_calendar(session: AsyncSession, org_id: str) -> list[dict[str, Any]]:
    org = await session.get(OrganizationProfile, org_id)
    role = org.user_role if org else "businessman"
    org_types = {"ip": ["ip", "all"], "accountant": ["ul", "all"], "businessman": ["ul", "all"]}
    allowed = org_types.get(role, ["ul", "all"])

    result = await session.execute(
        select(TaxDeadline).where(TaxDeadline.org_type.in_(allowed)).order_by(TaxDeadline.due_date)
    )
    rows = result.scalars().all()
    today = date.today()
    out = []
    for r in rows:
        try:
            parts = r.due_date.split(".")
            due = date(int(parts[2]), int(parts[1]), int(parts[0]))
            days_left = (due - today).days
        except (ValueError, IndexError):
            days_left = None
        out.append(
            {
                "code": r.code,
                "title": r.title,
                "due_date": r.due_date,
                "org_type": r.org_type,
                "description": r.description,
                "demo_amount": r.demo_amount,
                "days_left": days_left,
            }
        )
    return out


def format_tax_calendar_reply(items: list[dict[str, Any]], org_name: str, role: str) -> str:
    role_label = {"ip": "ИП", "accountant": "бухгалтер", "businessman": "организация"}.get(role, "организация")
    lines = [f"**Налоговый календарь** для {org_name} ({role_label}):\n"]
    for item in items[:8]:
        amt = f" — ориентир **{item['demo_amount']:,.0f} BYN**" if item.get("demo_amount") else ""
        left = ""
        if item.get("days_left") is not None:
            d = item["days_left"]
            left = f" _(через {d} дн.)_" if d >= 0 else " _(просрочено)_"
        lines.append(f"• **{item['title']}** — до {item['due_date']}{left}{amt}")
        if item.get("description"):
            lines.append(f"  {item['description']}")
    lines.append("\nМогу подготовить черновик платежа в Минфин или открыть зарплатные обязательства.")
    return "\n".join(lines)


def demo_fszh_amount(payroll_base: float = 5000.0) -> float:
    """Demo ФСЗН ~34% employer share simplified."""
    return round(payroll_base * 0.34, 2)
