"""Counterparty due diligence — risk scoring."""
from __future__ import annotations

import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Counterparty
from services.banking.queries import lookup_counterparty, normalize_counterparty_query


async def get_counterparty_risk(
    session: AsyncSession, org_id: str, name_or_unp: str
) -> dict[str, Any] | None:
    raw = (name_or_unp or "").strip()
    unp_digits = re.sub(r"\D", "", raw)
    if len(unp_digits) == 9:
        result = await session.execute(
            select(Counterparty).where(
                Counterparty.org_id == org_id,
                Counterparty.unp == unp_digits,
            )
        )
        row = result.scalar_one_or_none()
    else:
        row = await lookup_counterparty(session, org_id, normalize_counterparty_query(raw))

    if not row:
        return None

    score = getattr(row, "risk_score", None) or 50.0
    level = getattr(row, "risk_level", None) or _level_from_score(score)
    notes = getattr(row, "risk_notes", None) or ""
    return {
        "id": row.id,
        "name": row.name,
        "unp": row.unp,
        "account": row.account,
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
