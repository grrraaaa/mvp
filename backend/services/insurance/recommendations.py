"""Insurance product recommendations after clarify flow."""
from __future__ import annotations

import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import InsuranceProduct


async def find_insurance_products(session: AsyncSession, message: str) -> list[InsuranceProduct]:
    low = message.lower()
    result = await session.execute(select(InsuranceProduct).where(InsuranceProduct.is_active == True))
    products = result.scalars().all()
    scored: list[tuple[int, InsuranceProduct]] = []
    for p in products:
        score = 0
        for kw in p.keywords.split(","):
            kw = kw.strip().lower()
            if kw and kw in low:
                score += 2
        if p.category.lower() in low:
            score += 3
        if score > 0:
            scored.append((score, p))
    scored.sort(key=lambda x: -x[0])
    if scored:
        return [p for _, p in scored[:3]]
    # Default by clarify keywords
    if re.search(r"имуществ|офис|склад|помещен", low):
        return [p for p in products if p.category == "property"][:2]
    if re.search(r"сотрудник|жизн|несчастн|труд", low):
        return [p for p in products if p.category == "life"][:2]
    if re.search(r"кредит|залог|обеспечен", low):
        return [p for p in products if p.category == "credit"][:2]
    return products[:2]


def format_insurance_reply(products: list[InsuranceProduct]) -> str:
    lines = ["**Подбор страховых продуктов для бизнеса:**\n"]
    for p in products:
        lines.append(f"• **{p.name}** — от {p.premium_from:.0f} BYN/год")
        lines.append(f"  {p.description}")
        if p.coverage:
            lines.append(f"  Покрытие: {p.coverage}")
    lines.append("\nОформление полиса — демо-заявка через консультанта.")
    return "\n".join(lines)
