"""Консультации по банковским сервисам из каталога БД."""
from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankService


async def find_service(session: AsyncSession, message: str) -> BankService | None:
    low = message.lower()
    result = await session.execute(select(BankService))
    services = result.scalars().all()
    best: BankService | None = None
    best_score = 0
    for svc in services:
        score = 0
        for kw in svc.keywords.split(","):
            kw = kw.strip().lower()
            if kw and kw in low:
                score += 2
        if svc.name.lower() in low:
            score += 3
        if score > best_score:
            best_score = score
            best = svc
    if best_score == 0 and re.search(r"эквайринг|тариф|подключ", low):
        for svc in services:
            if "эквайринг" in svc.name.lower() and "эквайринг" in low:
                return svc
    return best if best_score > 0 else None


def format_service_reply(svc: BankService) -> tuple[str, list[dict]]:
    msg = (
        f"**{svc.name}**\n\n{svc.description}\n\n"
        f"Тариф: {svc.tariff}"
    )
    buttons = [
        {"label": "Подключить", "url": svc.connect_url, "variant": "primary"},
        {"label": "Сравнить тарифы", "message": f"Сравни тарифы {svc.name}", "variant": "secondary"},
        {"label": "Подать заявку", "url": svc.connect_url, "variant": "secondary"},
    ]
    return msg, buttons
