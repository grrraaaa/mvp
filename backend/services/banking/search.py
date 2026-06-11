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


_CURRENCY_PATTERNS: tuple[tuple[str, str], ...] = (
    (r"\bруб\w*\b", "RUB"),  # руб / рублей / рубля
    (r"\bр\.\b", "RUB"),  # сокращение «р.»
    (r"\bбел\.?\s*руб\w*\b", "BYN"),
    (r"\bbyn\b", "BYN"),
    (r"\bбел\w*\b", "BYN"),
    (r"\busd\b", "USD"),
    (r"\bдоллар\w*\b", "USD"),
    (r"\bевро\b", "EUR"),
    (r"\beur\b", "EUR"),
    (r"\brub\b", "RUB"),
)


def _parse_currency(text: str) -> str | None:
    """Извлечь валюту из текста: «150 рублей» → "RUB", «100 BYN» → "BYN"."""
    low = text.lower()
    for pat, code in _CURRENCY_PATTERNS:
        if re.search(pat, low):
            return code
    return None


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


def _parse_doc_number(query: str) -> str | None:
    """Извлечь номер документа из запроса: «покажи отчёт номер 211» → «211».

    Поддерживает:
    - «№211», «№ 211», «№211/1» (берёт только цифры до слэша/буквы)
    - «номер 211», «номером 211», «номер №211»
    - «документ 211», «отчёт 211»

    Возвращает None, если цифра — это часть суммы:
    - «перевод на 150 рублей» (предлог «на» + цифра + валюта)
    - «платёж 100 BYN» (цифра + код валюты)
    - «сумма 2500» (явное «сумма»)
    """
    low = query.lower()
    # Сначала явный «номер» / «№» — это надёжный сигнал, что цифра = номер документа
    m = re.search(
        r"(?:номер\w*|№)\s*№?\s*(\d{1,6})",
        low,
    )
    if m:
        return m.group(1)
    # Иначе любая цифра, если запрос про документ/отчёт/выписку
    if re.search(r"документ\w*|отч[её]т\w*|выписк\w*|плат[её]ж\w*|платёж\w*", low):
        m = re.search(r"(\d{1,6})", low)
        if m:
            digit = m.group(1)
            start, end = m.span()
            # «перевод на 150 рублей» / «платёж 100 BYN» — цифра = сумма
            after = low[end:end + 12]
            if re.match(
                r"[\s.]*(?:руб\w*|бел\.?\s*руб|бел\w*|byn|usd|eur|rub|доллар\w*|евро)\b",
                after,
            ):
                return None
            # «на 150 …» / «по 500 …» / «от 100 …» — предлог + цифра = сумма
            before = low[:start].rstrip()
            if before.endswith(("на", "по", "от", "за")):
                return None
            # «сумма 2500» / «суммой 1000» — слово «сумм» рядом
            if re.search(r"сумм\w*", before):
                return None
            n = int(digit)
            # 4-значные 2000–2099 — это годы, не номера; 19xx/20xx — тоже годы
            if 1900 <= n <= 2099:
                return None
            return digit
    return None


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
    cleaned = re.sub(
        r"\d+|[.,:;!?()«»\"']|"
        r"руб\w*|бел\.?\s*руб\w*|бел\w*|тыс|000|"
        r"доллар\w*|евро\b|usd|eur|rub",
        " ",
        text.lower(),
        flags=re.I,
    )
    terms: list[str] = []
    for token in cleaned.split():
        token = token.strip("-—")
        if len(token) < 3 or token in STOPWORDS:
            continue
        terms.append(token)
    return terms


def _match_variants(token: str) -> list[str]:
    """Лёгкая нормализация падежных окончаний: «Иванова»→«Иванов», «Ромашку»→«Ромашк».

    Возвращает варианты подстрок для ILIKE-поиска (от исходного к более короткому стему).
    """
    variants = [token]
    # отрезаем до 2 последних символов, сохраняя минимально осмысленный стем
    for cut in (1, 2):
        if len(token) - cut >= 5:
            stem = token[:-cut]
            if stem not in variants:
                variants.append(stem)
    return variants


async def search_reports(
    session: AsyncSession, query: str, limit: int = 10, org_id: str = "demo"
) -> list[SearchHit]:
    """Поиск отчётов и информационных документов (INFO:*, выписки)."""
    month, year = _parse_month_year(query)
    doc_number = _parse_doc_number(query)
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
        if doc_number and doc_number not in (d.doc_number or ""):
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

    if not hits and (month or year or doc_number):
        for d in rows:
            if month and d.doc_date and f".{month}." not in d.doc_date:
                continue
            if year and d.doc_date and year not in d.doc_date:
                continue
            if doc_number and doc_number not in (d.doc_number or ""):
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
    currency = _parse_currency(q)
    month, year = _parse_month_year(q)
    doc_number = _parse_doc_number(q)

    # Точные совпадения (AND между собой): сумма, валюта, номер документа.
    # Это ответ на запросы вроде «найди перевод на 150 рублей» — не хотим
    # захватить все 150 BYN или все RUB-платежи, только amount=150 AND currency=RUB.
    exact_filters = []
    if amount is not None:
        exact_filters.append(BankDocument.amount == amount)
    if currency is not None:
        exact_filters.append(BankDocument.currency == currency)
    if doc_number is not None:
        # Точное/частичное совпадение по номеру (без префикса «№»)
        exact_filters.append(BankDocument.doc_number.ilike(f"%{doc_number}%"))

    # Нечёткие совпадения (OR между собой): контрагент, назначение, тип.
    fuzzy_filters = []
    terms = _search_terms(low)
    for token in terms:
        for variant in _match_variants(token):
            fuzzy_filters.append(BankDocument.counterparty.ilike(f"%{variant}%"))
            fuzzy_filters.append(BankDocument.purpose.ilike(f"%{variant}%"))
        fuzzy_filters.append(BankDocument.doc_type.ilike(f"%{token}%"))

    doc_filters: list = []
    if exact_filters and fuzzy_filters:
        # Точные (AND) ИЛИ нечёткие (OR) — две альтернативные стратегии поиска.
        from sqlalchemy import and_ as sa_and

        doc_filters.append(sa_and(*exact_filters) if len(exact_filters) > 1 else exact_filters[0])
        doc_filters.extend(fuzzy_filters)
    else:
        doc_filters = exact_filters + fuzzy_filters

    stmt = select(BankDocument).where(BankDocument.org_id == org_id)
    if doc_filters:
        stmt = stmt.where(or_(*doc_filters))
    result = await session.execute(stmt.limit(limit))
    docs = result.scalars().all()

    if month:
        docs = [d for d in docs if d.doc_date and f".{month}." in d.doc_date]
    if year:
        docs = [d for d in docs if d.doc_date and year in d.doc_date]
    if doc_number:
        docs = [d for d in docs if doc_number in (d.doc_number or "")]
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

    hits: list[SearchHit] = []
    for d in docs:
        is_info = d.doc_type.startswith(INFO_PREFIX)
        # Для информационных документов (INFO:*) у контрагента и суммы обычно
        # пусто — рендерим как «отчёт», чтобы карточка открывалась корректно,
        # а в заголовке показываем тип, а не пустую строку.
        if is_info:
            kind = "report"
            kind_label = d.doc_type.replace(INFO_PREFIX, "")[:50]
            title = f"{d.doc_number} — {kind_label}" if kind_label else d.doc_number
            subtitle = d.purpose[:120] or d.counterparty[:80]
        else:
            kind = "payment"
            cp = d.counterparty or d.purpose[:80]
            title = f"{d.doc_number} — {cp}" if cp else d.doc_number
            subtitle = d.purpose[:120]
        hits.append(
            SearchHit(
                kind=kind,
                id=d.id,
                title=title,
                subtitle=subtitle,
                amount=d.amount,
                currency=d.currency,
                status=d.status,
                url=document_view_url(d.id),
            )
        )

    cp_stmt = select(Counterparty).where(Counterparty.org_id == org_id)
    cp_filters = []
    for token in terms:
        for variant in _match_variants(token):
            cp_filters.append(Counterparty.name.ilike(f"%{variant}%"))
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
