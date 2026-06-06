"""Counterparty due diligence — risk scoring."""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Counterparty


async def get_counterparty_risk(
    session: AsyncSession, org_id: str, name_or_unp: str
) -> dict[str, Any] | None:
    low = name_or_unp.lower().strip()
    result = await session.execute(select(Counterparty).where(Counterparty.org_id == org_id))
    rows = result.scalars().all()
    best: Counterparty | None = None
    for c in rows:
        if low in c.name.lower() or (c.unp and c.unp in name_or_unp):
            best = c
            break
    if not best:
        return None
    score = getattr(best, "risk_score", None) or 50.0
    level = getattr(best, "risk_level", None) or _level_from_score(score)
    notes = getattr(best, "risk_notes", None) or ""
    return {
        "id": best.id,
        "name": best.name,
        "unp": best.unp,
        "account": best.account,
        "risk_score": score,
        "risk_level": level,
        "risk_notes": notes,
    }


def _level_from_score(score: float) -> str:
    if score >= 75:
        return "low"
    if score >= 45:
        return "medium"
    return "high"


def format_risk_report(data: dict[str, Any]) -> str:
    level_ru = {"low": "низкий", "medium": "средний", "high": "высокий"}.get(data["risk_level"], "средний")
    emoji = {"low": "🟢", "medium": "🟡", "high": "🔴"}.get(data["risk_level"], "🟡")
    lines = [
        f"{emoji} **Проверка контрагента: {data['name']}**",
        f"УНП: {data['unp'] or '—'}",
        f"Риск-скор: **{data['risk_score']:.0f}/100** ({level_ru})",
    ]
    if data.get("risk_notes"):
        lines.append(f"\n{data['risk_notes']}")
    lines.append("\nДанные демо-реестра. Для полной проверки откройте раздел «Проверка контрагента».")
    return "\n".join(lines)
