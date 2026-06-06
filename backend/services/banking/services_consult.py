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


async def compare_tariffs(session: AsyncSession, message: str) -> tuple[str, list[dict]] | None:
    low = message.lower()
    if not re.search(r"сравн\w*\s+тариф|тариф\w*\s+сравн", low):
        return None
    result = await session.execute(select(BankService))
    services = result.scalars().all()
    group = [s for s in services if "эквайринг" in s.name.lower()] if "эквайринг" in low else services[:4]
    if len(group) < 2:
        group = services[:3]
    lines = ["**Сравнение тарифов (демо):**\n"]
    for s in group:
        lines.append(f"• **{s.name}** — {s.tariff}")
        lines.append(f"  {s.description[:120]}…" if len(s.description) > 120 else f"  {s.description}")
    lines.append("\nПодключение — заявка через консультанта.")
    buttons = [
        {"label": "Подключить", "message": "connect_service_demo", "variant": "primary"},
        {"label": "Подробнее", "url": "/services", "variant": "secondary"},
    ]
    return "\n".join(lines), buttons


def calc_acquiring_roi(monthly_turnover: float, tariff_percent: float = 1.2) -> dict:
    """Demo ROI: commission vs cash-handling savings."""
    monthly_fee = monthly_turnover * tariff_percent / 100
    cash_handling = monthly_turnover * 0.008
    net_benefit = cash_handling - monthly_fee
    months_to_payback = max(0.5, 1500 / max(net_benefit, 1))
    return {
        "monthly_fee": monthly_fee,
        "annual_fee": monthly_fee * 12,
        "cash_savings": cash_handling,
        "net_monthly": net_benefit,
        "payback_months": months_to_payback,
    }


async def maybe_roi_reply(session: AsyncSession, message: str) -> tuple[str, list[dict]] | None:
    low = message.lower()
    if not re.search(r"roi|окупаемост|выгод\w*|калькулятор|рассчит\w*\s+выгод", low):
        return None
    turnover_m = re.search(r"(\d[\d\s]{2,})", message)
    turnover = float(turnover_m.group(1).replace(" ", "")) if turnover_m else 80_000.0
    tariff_m = re.search(r"(\d+[.,]\d+|\d+)\s*%", message)
    tariff = float(tariff_m.group(1).replace(",", ".")) if tariff_m else 1.2
    roi = calc_acquiring_roi(turnover, tariff)
    lines = [
        f"**ROI-калькулятор эквайринга (демо)** при обороте **{turnover:,.0f} BYN/мес** и тарифе **{tariff}%**:",
        f"• Комиссия банка: **{roi['monthly_fee']:,.2f} BYN/мес** ({roi['annual_fee']:,.0f} BYN/год)",
        f"• Экономия на инкассации (оценка): **{roi['cash_savings']:,.2f} BYN/мес**",
        f"• Чистая выгода: **{roi['net_monthly']:,.2f} BYN/мес**",
        f"• Окупаемость терминала (~1 500 BYN): **~{roi['payback_months']:.1f} мес.**",
        "\nПодключение — оформите заявку через консультанта.",
    ]
    buttons = [
        {"label": "Оформить заявку", "message": "connect_service_demo", "variant": "primary"},
        {"label": "Сравнить тарифы", "message": "Сравни тарифы эквайринга", "variant": "secondary"},
    ]
    return "\n".join(lines), buttons


def format_service_reply(svc: BankService) -> tuple[str, list[dict]]:
    msg = (
        f"**{svc.name}**\n\n{svc.description}\n\n"
        f"Тариф: {svc.tariff}"
    )
    buttons = [
        {"label": "Подключить", "message": f"connect_service:{svc.id}", "variant": "primary"},
        {"label": "Сравнить тарифы", "message": f"Сравни тарифы {svc.name}", "variant": "secondary"},
    ]
    return msg, buttons
