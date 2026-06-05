"""Умный поиск по демо-данным банка (документы, контрагенты, платежи)."""
from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankDocument, Counterparty


@dataclass
class SearchHit:
    kind: str  # document | counterparty | payment
    id: str
    title: str
    subtitle: str
    amount: float | None
    currency: str | None
    status: str | None
    url: str | None


def _parse_amount(text: str) -> float | None:
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:000|тыс)?", text.replace(" ", ""))
    if not m:
        return None
    val = float(m.group(1).replace(",", "."))
    if "тыс" in text.lower() or "000" in text:
        if val < 1000:
            val *= 1000
    return val


def _parse_month_year(text: str) -> tuple[str | None, str | None]:
    months = {
        "январ": "01",
        "феврал": "02",
        "март": "03",
        "апрел": "04",
        "май": "05",
        "июн": "06",
        "июл": "07",
        "август": "08",
        "сентябр": "09",
        "октябр": "10",
        "ноябр": "11",
        "декабр": "12",
    }
    low = text.lower()
    month = next((v for k, v in months.items() if k in low), None)
    ym = re.search(r"(20\d{2})", text)
    year = ym.group(1) if ym else None
    return month, year


async def smart_search(
    session: AsyncSession, query: str, limit: int = 10, org_id: str = "demo"
) -> list[SearchHit]:
    q = query.strip()
    if not q:
        return []

    low = q.lower()
    amount = _parse_amount(q)
    month, year = _parse_month_year(q)

    doc_filters = []
    if amount is not None:
        doc_filters.append(BankDocument.amount == amount)
    name_part = re.sub(r"\d+|[.,]|руб|byn|бел|тыс|000", "", low, flags=re.I).strip()
    for token in name_part.split():
        if len(token) >= 3:
            doc_filters.append(BankDocument.counterparty.ilike(f"%{token}%"))
            doc_filters.append(BankDocument.purpose.ilike(f"%{token}%"))

    stmt = select(BankDocument).where(BankDocument.org_id == org_id)
    if doc_filters:
        stmt = stmt.where(or_(*doc_filters))
    result = await session.execute(stmt.limit(limit))
    docs = result.scalars().all()

    if month:
        docs = [d for d in docs if d.doc_date and f".{month}." in d.doc_date]
    if year:
        docs = [d for d in docs if d.doc_date and year in d.doc_date]

    hits: list[SearchHit] = [
        SearchHit(
            kind="payment",
            id=d.id,
            title=f"{d.doc_number} — {d.counterparty}",
            subtitle=d.purpose[:120],
            amount=d.amount,
            currency=d.currency,
            status=d.status,
            url="/payments",
        )
        for d in docs
    ]

    cp_stmt = select(Counterparty).where(Counterparty.org_id == org_id)
    cp_filters = []
    for token in name_part.split():
        if len(token) >= 3:
            cp_filters.append(Counterparty.name.ilike(f"%{token}%"))
            cp_filters.append(Counterparty.unp.ilike(f"%{token}%"))
    if cp_filters:
        cp_result = await session.execute(cp_stmt.where(or_(*cp_filters)).limit(5))
        for c in cp_result.scalars().all():
            hits.append(
                SearchHit(
                    kind="counterparty",
                    id=c.id,
                    title=c.name,
                    subtitle=f"УНП {c.unp} · {c.bank_name}",
                    amount=None,
                    currency=None,
                    status=None,
                    url="/payments/counterparties",
                )
            )

    return hits[:limit]


def format_search_response(query: str, hits: list[SearchHit]) -> tuple[str, list[dict]]:
    if not hits:
        hints = []
        if "март" in query.lower() or "апрел" in query.lower():
            hints.append("убрать фильтр по месяцу")
        if re.search(r"\d", query):
            hints.append("изменить сумму")
        hint_text = ""
        if hints:
            hint_text = " Попробуйте: " + ", ".join(hints) + "."
        return (
            f"По запросу «{query}» ничего не найдено.{hint_text}",
            [],
        )

    if len(hits) > 1 and all(h.kind == "payment" for h in hits):
        lines = [f"Найдено {len(hits)} платежей. Выберите нужный:"]
        for i, h in enumerate(hits[:5], 1):
            lines.append(
                f"{i}. {h.title} — {h.amount} {h.currency} ({h.status})"
            )
        return "\n".join(lines), [_hit_source(h, i) for i, h in enumerate(hits[:5], 1)]

    h = hits[0]
    if h.kind == "counterparty":
        return (
            f"Карточка контрагента: **{h.title}**. {h.subtitle}",
            [_hit_source(h, 1)],
        )
    return (
        f"Документ {h.title}: {h.amount} {h.currency}, статус «{h.status}». {h.subtitle}",
        [_hit_source(h, 1)],
    )


def _hit_source(h: SearchHit, index: int) -> dict:
    return {
        "index": index,
        "label": f"Источник {index}: {h.title[:40]}",
        "kind": h.kind,
        "id": h.id,
        "url": h.url,
    }
