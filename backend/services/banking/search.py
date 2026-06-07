"""Умный поиск по демо-данным банка (документы, контрагенты, платежи, отчёты)."""
from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankDocument, Counterparty

INFO_PREFIX = "INFO:"

STOPWORDS = {
    "найди",
    "найти",
    "покажи",
    "поиск",
    "где",
    "платеж",
    "платёж",
    "платежи",
    "платежи",
    "документ",
    "документы",
    "счет",
    "счёт",
    "счета",
    "клиент",
    "клиента",
    "карточку",
    "карточка",
    "контрагент",
    "контрагента",
    "руб",
    "byn",
    "бел",
    "за",
    "от",
    "для",
    "и",
    "а",
    "в",
    "ооо",
    "ип",
}


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
    low = text.lower()
    if 2000 <= val <= 2099 and not re.search(r"руб|byn|сумм|на\s+\d", low):
        return None
    if "тыс" in low or "000" in text:
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


def document_view_url(doc_id: str) -> str:
    """Страница просмотра документа / отчёта в демо-интерфейсе."""
    return f"/other/documents/view?doc={doc_id}"


def is_report_query(query: str) -> bool:
    low = query.lower()
    return bool(re.search(r"отчёт|отчет|report|выписк", low)) and bool(
        re.search(r"найди|найти|покажи|поиск|где", low)
    )


def is_counterparty_query(query: str) -> bool:
    return bool(
        re.search(
            r"карточк\w*\s+(?:клиент|контрагент)|покажи\s+клиент|"
            r"покажи\s+контрагент|реквизит\w*\s+",
            query.lower(),
        )
    )


def _search_terms(text: str) -> list[str]:
    cleaned = re.sub(r"\d+|[.,:;!?()«»\"']|руб|byn|бел|тыс|000", " ", text.lower(), flags=re.I)
    terms: list[str] = []
    for token in cleaned.split():
        token = token.strip("-—")
        if len(token) < 3 or token in STOPWORDS:
            continue
        terms.append(token)
    return terms


async def search_reports(
    session: AsyncSession, query: str, limit: int = 10, org_id: str = "demo"
) -> list[SearchHit]:
    """Поиск отчётов и информационных документов (INFO:*, выписки)."""
    month, year = _parse_month_year(query)
    stmt = select(BankDocument).where(BankDocument.org_id == org_id)
    result = await session.execute(stmt.limit(200))
    rows = result.scalars().all()

    hits: list[SearchHit] = []
    for d in rows:
        is_info = d.doc_type.startswith(INFO_PREFIX)
        is_reportish = bool(
            re.search(r"отчёт|отчет|выписк|период|остаток|ведомость", d.purpose.lower())
            or re.search(r"выписк|остаток|ведомость|сведен", d.doc_type.lower())
        )
        if not is_info and not is_reportish:
            continue
        if month and (not d.doc_date or f".{month}." not in d.doc_date):
            if not (d.purpose and month == "03" and "март" in d.purpose.lower()):
                continue
        if year and d.doc_date and year not in d.doc_date and year not in d.purpose:
            continue
        kind_label = d.doc_type.replace(INFO_PREFIX, "") if is_info else d.doc_type
        hits.append(
            SearchHit(
                kind="report",
                id=d.id,
                title=f"{d.doc_number} — {kind_label[:50]}",
                subtitle=d.purpose[:120] or d.counterparty[:80],
                amount=d.amount,
                currency=d.currency,
                status=d.status,
                url=document_view_url(d.id),
            )
        )

    if not hits and (month or year):
        for d in rows:
            if month and d.doc_date and f".{month}." not in d.doc_date:
                continue
            if year and d.doc_date and year not in d.doc_date:
                continue
            if d.amount <= 0 and not d.doc_type.startswith(INFO_PREFIX):
                continue
            hits.append(
                SearchHit(
                    kind="payment",
                    id=d.id,
                    title=f"{d.doc_number} — {d.counterparty}",
                    subtitle=d.purpose[:120],
                    amount=d.amount,
                    currency=d.currency,
                    status=d.status,
                    url=document_view_url(d.id),
                )
            )

    return hits[:limit]


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
    terms = _search_terms(low)
    for token in terms:
        doc_filters.append(BankDocument.counterparty.ilike(f"%{token}%"))
        doc_filters.append(BankDocument.purpose.ilike(f"%{token}%"))
        doc_filters.append(BankDocument.doc_type.ilike(f"%{token}%"))

    stmt = select(BankDocument).where(BankDocument.org_id == org_id)
    if doc_filters:
        stmt = stmt.where(or_(*doc_filters))
    result = await session.execute(stmt.limit(limit))
    docs = result.scalars().all()

    if month:
        docs = [d for d in docs if d.doc_date and f".{month}." in d.doc_date]
    if year:
        docs = [d for d in docs if d.doc_date and year in d.doc_date]
    if re.search(r"сч[её]т", low) and not re.search(r"выписк|остаток|баланс", low):
        docs = [
            d
            for d in docs
            if re.search(r"сч[её]т", f"{d.doc_type} {d.purpose}".lower())
        ]
    if re.search(r"плат[её]ж", low):
        payment_docs = [
            d
            for d in docs
            if re.search(r"плат[её]ж|перевод", f"{d.doc_type} {d.purpose}".lower())
        ]
        if payment_docs:
            docs = payment_docs

    hits: list[SearchHit] = [
        SearchHit(
            kind="payment",
            id=d.id,
            title=f"{d.doc_number} — {d.counterparty}",
            subtitle=d.purpose[:120],
            amount=d.amount,
            currency=d.currency,
            status=d.status,
            url=document_view_url(d.id),
        )
        for d in docs
    ]

    cp_stmt = select(Counterparty).where(Counterparty.org_id == org_id)
    cp_filters = []
    for token in terms:
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
                    url=f"/services/counterparty?cp={c.id}",
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

    report_hits = [h for h in hits if h.kind == "report"]
    payment_hits = [h for h in hits if h.kind == "payment"]
    counterparty_hits = [h for h in hits if h.kind == "counterparty"]

    if report_hits and (len(report_hits) >= len(payment_hits) or is_report_query(query)):
        hits = report_hits
        if len(hits) > 1:
            lines = [f"Найдено {len(hits)} отчётов. Выберите нужный:"]
            for i, h in enumerate(hits[:5], 1):
                lines.append(f"{i}. {h.title} ({h.status})")
            return "\n".join(lines), [_hit_source(h, i) for i, h in enumerate(hits[:5], 1)]
        h = hits[0]
        return (
            f"**Отчёт:** {h.title}\n{h.subtitle}\nСтатус: {h.status}",
            [_hit_source(h, 1)],
        )

    if counterparty_hits and (is_counterparty_query(query) or not payment_hits):
        hits = counterparty_hits
        if len(hits) > 1:
            lines = [f"Нашёл {len(hits)} контрагентов. Выберите карточку:"]
            for i, h in enumerate(hits[:5], 1):
                lines.append(f"{i}. {h.title} — {h.subtitle}")
            return "\n".join(lines), [_hit_source(h, i) for i, h in enumerate(hits[:5], 1)]
        h = hits[0]
        return (
            f"Карточка контрагента: **{h.title}**. {h.subtitle}",
            [_hit_source(h, 1)],
        )

    if len(hits) > 1 and all(h.kind == "payment" for h in hits):
        lines = [f"Найдено {len(hits)} платежей. Выберите нужный:"]
        for i, h in enumerate(hits[:5], 1):
            lines.append(
                f"{i}. {h.title} — {h.amount} {h.currency} ({h.status})"
            )
        return "\n".join(lines), [_hit_source(h, i) for i, h in enumerate(hits[:5], 1)]

    h = hits[0]
    if h.kind == "report":
        return (
            f"**Отчёт:** {h.title}\n{h.subtitle}\nСтатус: {h.status}",
            [_hit_source(h, 1)],
        )
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
    highlight = ["amount", "counterparty", "purpose"] if h.kind == "payment" else []
    url = h.url or (document_view_url(h.id) if h.id else "/other/documents")
    return {
        "index": index,
        "label": f"Источник {index}: {h.title[:40]}",
        "kind": h.kind,
        "id": h.id,
        "url": url,
        "highlight_fields": highlight or None,
    }
