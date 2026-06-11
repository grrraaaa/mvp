"""Запросы к банковским данным для ассистента."""
from __future__ import annotations

import logging
import re
from collections import defaultdict
from datetime import datetime
from urllib.parse import quote

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankAccount, BankDocument, Counterparty, OrganizationProfile, StatementLine
from services.ai.cash_forecast import (
    build_cash_forecast,
    forecast_to_assistant_response,
)
from services.banking.analytics import (
    cash_gap_forecast,
    compare_months,
    monthly_expenses,
    to_chart_bar,
    to_chart_line,
    to_chart_pie,
)
from services.banking.notifications import handle_notification_query, is_notification_query
from services.banking.search import (
    document_view_url,
    format_search_response,
    is_report_query,
    search_reports,
    smart_search,
)

logger = logging.getLogger(__name__)


def _build_search_payload(message: str, hits: list, sources: list[dict], text: str) -> dict:
    """Common envelope for search results: navigation on single hit, chips on empty."""
    payload: dict = {"message": text, "sources": sources}
    buttons: list[dict] = []
    if hits:
        first_url = sources[0]["url"] if sources else document_view_url(hits[0].id)
        is_cp = hits[0].kind == "counterparty"
        label = (
            "Открыть карточку"
            if is_cp
            else ("Открыть отчёт" if hits[0].kind == "report" else "Открыть документ")
        )
        buttons.append({"label": label, "url": first_url, "variant": "primary"})
        # Single hit → navigate straight to it (counterparty card / document view).
        if len(hits) == 1 and first_url:
            payload["ui_actions"] = [{"type": "navigate", "target": first_url}]
        if hits[0].kind == "payment":
            cp = hits[0].title.split("—")[-1].strip() if "—" in hits[0].title else ""
            if cp:
                buttons.append({"label": "Связанные платежи", "message": f"Платежи {cp}", "variant": "secondary"})
        if len(hits) > 1:
            buttons.append({"label": "Все документы", "url": "/other/documents", "variant": "secondary"})
    else:
        payload["suggested_chips"] = [
            "Найди платежи Иванова",
            "Покажи карточку клиента Петров",
            "Сколько на счёте?",
        ]
    payload["action_buttons"] = buttons
    return payload


_CP_LOOKUP_STOPWORDS = frozenset(
    {
        "ооо",
        "оао",
        "зао",
        "ип",
        "пао",
        "уп",
        "рб",
        "бел",
        "by",
        "byn",
        "контрагент",
        "контрагента",
        "контрагенту",
        "получатель",
        "получателя",
        "получателю",
        "поставщик",
        "поставщика",
        "наименование",
        "проверь",
        "проверить",
        "открой",
        "открыть",
        "покажи",
        "карточку",
        "карточка",
    }
)


def normalize_counterparty_query(name: str) -> str:
    """Убрать служебные слова: «контрагент ООО Ромашка» → «ООО Ромашка»."""
    text = (name or "").strip().strip("«»\"'.,;")
    text = re.sub(
        r"^(?:получател\w*|контрагент\w*|поставщик\w*|наименование\s+контрагент\w*)\s*[:—-]?\s*",
        "",
        text,
        flags=re.I,
    ).strip()
    text = text.replace('"', "").replace("«", "").replace("»", "").strip()
    return text


async def lookup_counterparty(
    session: AsyncSession, org_id: str, name: str
) -> Counterparty | None:
    """Найти контрагента организации в PostgreSQL по имени (с учётом падежей)."""
    from services.banking.search import _match_variants

    query = normalize_counterparty_query(name)
    if len(query) < 2:
        return None

    async def _best_ilike_match(pattern: str) -> Counterparty | None:
        result = await session.execute(
            select(Counterparty)
            .where(Counterparty.org_id == org_id, Counterparty.name.ilike(f"%{pattern}%"))
            .order_by(Counterparty.name)
            .limit(8)
        )
        rows = result.scalars().all()
        if not rows:
            return None
        pattern_low = pattern.lower()
        for row in rows:
            if pattern_low in row.name.lower():
                return row
        return rows[0]

    row = await _best_ilike_match(query)
    if row:
        return row

    # Fallback: значимые токены (без «ООО», «контрагент» и т.п.), длинные первыми
    tokens = [
        t
        for t in re.split(r"\s+", query)
        if len(t) >= 3 and t.lower() not in _CP_LOOKUP_STOPWORDS
    ]
    tokens.sort(key=len, reverse=True)
    for token in tokens:
        for variant in _match_variants(token.lower()):
            if variant in _CP_LOOKUP_STOPWORDS:
                continue
            row = await _best_ilike_match(variant)
            if row:
                return row
    return None


async def get_org_profile(session: AsyncSession, org_id: str = "demo") -> OrganizationProfile:
    result = await session.execute(
        select(OrganizationProfile).where(OrganizationProfile.id == org_id)
    )
    row = result.scalar_one_or_none()
    if row:
        return row
    return OrganizationProfile(id="demo", org_name="DEMO ЮРИДИЧЕСКОЕ ЛИЦО", user_role="businessman")


async def get_balance_summary(session: AsyncSession, org_id: str = "demo") -> str:
    """Текстовая сводка по счетам — оставлена как shim для совместимости.

    Используйте `get_balance_data()` — она возвращает структурированный dict
    с реальными суммами из БД, пригодный для построения графиков.
    """
    data = await get_balance_data(session, org_id)
    byn = data["total_byn"]
    parts = [f"**{byn:,.2f} BYN** на расчётных счетах"]
    for cur_key, cur_label in (("total_eur", "EUR"), ("total_usd", "USD"), ("total_rub", "RUB")):
        total = data[cur_key]
        if total:
            parts.append(f"{total:,.2f} {cur_label}")
    return "Остаток по счетам: " + "; ".join(parts) + "."


async def get_balance_data(
    session: AsyncSession, org_id: str = "demo", *, history_months: int = 6
) -> dict:
    """Реальные данные по остаткам из БД (BankAccount + StatementLine).

    Возвращает dict:
      {
        "total_byn": float, "total_eur": float, "total_usd": float, "total_rub": float,
        "accounts": [{"iban": str, "label": str, "currency": str, "balance": float,
                      "account_type": str}],
        "history": [{"month": "YYYY-MM", "label": str, "amount": float,
                     "debit": float, "credit": float}]
      }

    `amount` в history — чистый поток за месяц (credit − debit) по всем
    счетам организации в BYN. Берётся агрегатом из statement_lines, без
    моков и хардкода.
    """
    accounts_q = await session.execute(
        select(BankAccount).where(
            BankAccount.org_id == org_id, BankAccount.hidden.is_(False)
        )
    )
    accounts = list(accounts_q.scalars().all())

    totals: dict[str, float] = defaultdict(float)
    accounts_out: list[dict] = []
    for acc in accounts:
        totals[acc.currency] += float(acc.balance or 0.0)
        accounts_out.append(
            {
                "iban": acc.iban,
                "label": acc.label or "",
                "currency": acc.currency,
                "balance": round(float(acc.balance or 0.0), 2),
                "account_type": acc.account_type or "",
            }
        )

    # Monthly aggregation of statement_lines (net flow credit − debit).
    # Real DB aggregate; falls back to last-6-months window starting at the
    # earliest date we have, so empty DBs still return up to history_months
    # empty slots (labelled) instead of failing.
    monthly: dict[str, dict[str, float]] = defaultdict(
        lambda: {"debit": 0.0, "credit": 0.0, "count": 0}
    )
    lines_q = await session.execute(
        select(StatementLine).where(StatementLine.org_id == org_id)
    )
    for line in lines_q.scalars().all():
        try:
            dt = datetime.strptime(line.operation_date, "%d.%m.%Y")
        except (ValueError, TypeError):
            continue
        key = dt.strftime("%Y-%m")
        monthly[key]["debit"] += float(line.debit or 0.0)
        monthly[key]["credit"] += float(line.credit or 0.0)
        monthly[key]["count"] += 1

    # Pick the most recent N months that have data, OR (if no data) the
    # current calendar month minus N+1 .. -1 slots.
    if monthly:
        sorted_keys = sorted(monthly.keys(), reverse=True)
        chosen = sorted_keys[:history_months]
        chosen_set = set(chosen)
    else:
        # Fallback window: anchor on today; produce history_months empty months
        today = datetime.utcnow()
        chosen = [
            f"{(today.year + (today.month - i - 1) // 12):04d}-"
            f"{(today.month - i - 1) % 12 + 1:02d}"
            for i in range(history_months)
        ]
        chosen_set = set(chosen)

    _RU_MONTHS = {
        1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
        5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
        9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь",
    }

    history_out: list[dict] = []
    for key in sorted(chosen):
        agg = monthly.get(key, {"debit": 0.0, "credit": 0.0, "count": 0})
        year, month = key.split("-")
        label = f"{_RU_MONTHS[int(month)]} {year}"
        history_out.append(
            {
                "month": key,
                "label": label,
                "amount": round(agg["credit"] - agg["debit"], 2),
                "debit": round(agg["debit"], 2),
                "credit": round(agg["credit"], 2),
            }
        )

    return {
        "total_byn": round(totals.get("BYN", 0.0), 2),
        "total_eur": round(totals.get("EUR", 0.0), 2),
        "total_usd": round(totals.get("USD", 0.0), 2),
        "total_rub": round(totals.get("RUB", 0.0), 2),
        "accounts": accounts_out,
        "history": history_out,
    }


def is_balance_query(message: str) -> bool:
    """Детектор «сколько на счёте / остаток / баланс» — поддерживает ё/е."""
    low = message.lower()
    return bool(
        re.search(
            r"сколько\s+(?:денег|средств|на\s+сч[её]т|на\s+сч[её]те)|"
            r"остаток|баланс|на\s+сч[её]т|на\s+сч[её]те|"
            r"сколько\s+(?:у\s+меня|осталось|есть)",
            low,
        )
    )


def is_search_query(message: str) -> bool:
    low = message.lower()
    return bool(
        re.search(
            r"найди|найти|нади|найй|поищи|\bищи\b|покажи|показать|поиск|"
            r"где\s+(?:платёж|платеж|документ|счёт|счет|оплат)|"
            r"карточк\w*\s+(?:клиент|контрагент)|"
            r"откро\w*\s+(?:карточк|контрагент|клиент|документ)",
            low,
        )
    )


# «платежи Иванова за март», «переводы ООО Ромашка», «оплаты Петрова»
_PAYMENTS_BY_NAME_RE = re.compile(
    r"^(?:покажи\s+|найди\s+|все\s+)?(?:платеж\w*|плат[её]ж\w*|перевод\w*|оплат\w*)\s+(.+)$",
    re.I,
)


def is_payments_by_name_query(message: str) -> bool:
    low = message.strip().lower()
    if re.search(r"посл[ае]дн|создай|созда\w*\s+плат|повтор|отложен|аренд", low):
        return False
    m = _PAYMENTS_BY_NAME_RE.match(message.strip())
    if not m:
        return False
    rest = m.group(1).strip()
    # need an actual name token (letters), not just a period word
    cleaned = re.sub(
        r"за\s+|в\s+|на\s+|период\w*|месяц\w*|квартал\w*|год\w*|"
        r"январ\w*|феврал\w*|март\w*|апрел\w*|ма[йя]\w*|июн\w*|июл\w*|"
        r"август\w*|сентябр\w*|октябр\w*|ноябр\w*|декабр\w*|20\d{2}|\d+|[«»\"'.,]",
        " ",
        rest,
        flags=re.I,
    )
    return len(cleaned.strip()) >= 3


def is_open_counterparty_query(message: str) -> bool:
    low = message.lower()
    return bool(
        re.search(
            r"(?:откро\w*|покажи|показать|открыть)\s+(?:карточк\w*\s+)?(?:контрагент\w*|клиент\w*|поставщик\w*)"
            r"|карточк\w*\s+(?:контрагент\w*|клиент\w*)",
            low,
        )
    )


def _statement_period_from_text(message: str) -> tuple[str, str]:
    low = message.lower()
    if re.search(r"квартал|q[1-4]|отч[её]тн\w*\s+кварт", low):
        return "quarter", "отчётный квартал"
    if re.search(r"\bгод\b|годов", low):
        return "year", "год"
    if re.search(r"сегодня|текущ\w*\s+день", low):
        return "today", "сегодня"
    if re.search(r"вчера", low):
        return "yesterday", "вчера"
    if re.search(r"5\s*дн|пять\s+дн", low):
        return "5days", "последние 5 дней"
    months = {
        "январ": ("01", "январь"),
        "феврал": ("02", "февраль"),
        "март": ("03", "март"),
        "апрел": ("04", "апрель"),
        "май": ("05", "май"),
        "июн": ("06", "июнь"),
        "июл": ("07", "июль"),
        "август": ("08", "август"),
        "сентябр": ("09", "сентябрь"),
        "октябр": ("10", "октябрь"),
        "ноябр": ("11", "ноябрь"),
        "декабр": ("12", "декабрь"),
    }
    year_m = re.search(r"(20\d{2})", low)
    year = year_m.group(1) if year_m else "2026"
    for key, (month, label) in months.items():
        if key in low:
            return f"{year}-{month}", f"{label} {year}"
    return "month", "месяц"


async def _match_statement_account(
    session: AsyncSession, org_id: str, message: str
) -> BankAccount | None:
    low = message.lower()
    result = await session.execute(
        select(BankAccount).where(BankAccount.org_id == org_id, BankAccount.hidden == False)
    )
    accounts = result.scalars().all()
    for account in accounts:
        iban = account.iban.lower()
        compact_iban = re.sub(r"\s+", "", iban)
        if iban in low or compact_iban in re.sub(r"\s+", "", low):
            return account
        tail = re.sub(r"\D", "", account.iban)[-4:]
        if tail and re.search(rf"(?:сч[её]т|номер|№)\D*{re.escape(tail)}\b", low):
            return account
        label = (account.label or "").strip().lower()
        note = (account.note or "").strip().lower()
        if label and label in low:
            return account
        if note and note in low:
            return account
    return None


async def _statement_reply(
    session: AsyncSession, message: str, org_id: str
) -> dict | None:
    low = message.lower()
    if not re.search(r"выписк|операци\w*\s+по\s+сч[её]т|оборот\w*\s+по\s+сч[её]т", low):
        return None
    period, period_label = _statement_period_from_text(message)
    account = await _match_statement_account(session, org_id, message)
    url = f"/statement?period={period}"
    account_text = "по всем счетам"
    if account:
        url += f"&account={quote(account.iban)}"
        account_text = f"по счёту {account.iban} ({account.label or account.currency})"
    return {
        "message": (
            f"Открываю выписку за **{period_label}** {account_text}. "
            "На странице сразу применю фильтры и сформирую список операций."
        ),
        "sources": [
            {
                "index": 1,
                "label": f"Источник 1: Выписка за {period_label}",
                "kind": "account",
                "url": url,
            }
        ],
        "ui_actions": [{"type": "navigate", "target": url}],
        "action_buttons": [
            {"label": "Открыть выписку", "url": url, "variant": "primary"},
            {"label": "За квартал", "message": "Покажи выписку за отчётный квартал", "variant": "secondary"},
            {"label": "За год", "message": "Покажи выписку за год", "variant": "secondary"},
        ],
    }


# ──────────────────────────────────────────────────────────────────────────────
# AI-интент: «покажи все документы / документы за период / на подпись / …»
# ──────────────────────────────────────────────────────────────────────────────

_RU_MONTH_NAME = {
    1: "январь", 2: "февраль", 3: "март", 4: "апрель",
    5: "май", 6: "июнь", 7: "июль", 8: "август",
    9: "сентябрь", 10: "октябрь", 11: "ноябрь", 12: "декабрь",
}

_RU_MONTH_STEMS = (
    r"январ[ья]?|феврал[ья]?|март[а]?|апрел[ья]?|ма[йя]|мая|"
    r"июн[ья]?|июл[ья]?|август[а]?|сентябр[ья]?|октябр[ья]?|ноябр[ья]?|декабр[ья]?"
)


def _month_num_from_stem(stem: str) -> int | None:
    """Сопоставить стем названия месяца с номером 1–12."""
    s = (stem or "").strip().lower()
    if not s:
        return None
    for m_num, name in _RU_MONTH_NAME.items():
        if s.startswith(name[:4]) or name.startswith(s[:4]):
            return m_num
    return None


def is_banking_document_command(message: str) -> bool:
    """Команды журнала документов — обрабатывает banking, не page_actions."""
    low = (message or "").lower()
    if not re.search(r"документ\w*|журнал\w*", low):
        return False
    if re.search(r"документ\w*\s*(?:№|номер\w*)", low):
        return True
    if re.search(
        r"документы|все\s+документ|журнал\w*|реестр\w*",
        low,
    ) and re.search(
        r"контрагент|сумм\w*|от\s+\d|более|больше|руб|byn|usd|eur|"
        r"январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр|"
        r"с\s+(?:\d{1,2}[./]|январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)|"
        r"по\s+(?:\d{1,2}[./]|январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)|"
        r"за\s+\d{4}|на\s+подпис|проведен|черновик|плат[её]жн\w*\s+поручен",
        low,
    ):
        return True
    return False


def _parse_doc_period_from_text(message: str) -> dict:
    """Извлечь из сообщения фильтр документов: year / month / date_from / date_to.

    Возвращает dict с ключами: year, month, date_from, date_to, raw.
    """
    low = message.lower()
    out: dict = {"raw": message, "year": None, "month": None, "date_from": None, "date_to": None}

    # 1) Диапазон: "с 01.01.2026 по 31.03.2026" / "от 01.01 до 31.03"
    range_m = re.search(
        r"(?:с|от)\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)\s*(?:по|до)\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)",
        low,
    )
    if range_m:
        out["date_from"] = _normalize_date_token(range_m.group(1))
        out["date_to"] = _normalize_date_token(range_m.group(2))
        return out

    # 1b) Диапазон по названиям месяцев: «с февраля по май», «от января до марта»
    month_range_m = re.search(
        rf"(?:с|от)\s+({_RU_MONTH_STEMS})\s*(?:по|до|-)\s*({_RU_MONTH_STEMS})",
        low,
    )
    if month_range_m:
        m1 = _month_num_from_stem(month_range_m.group(1))
        m2 = _month_num_from_stem(month_range_m.group(2))
        year_m = re.search(r"(20\d{2})", low)
        year = int(year_m.group(1)) if year_m else 2026
        if m1 and m2:
            out["year"] = year
            out["date_from"] = f"01.{m1:02d}.{year}"
            last_day = _days_in_month(year, m2)
            out["date_to"] = f"{last_day:02d}.{m2:02d}.{year}"
            return out

    # 2) Месяц + год: "за март 2026", "за март", "за мартом 2026 года"
    month_m = re.search(
        r"за\s+(январ[ья]?|феврал[ья]?|март[а]?|апрел[ья]?|ма[йя]|мая|июн[ья]?|июл[ья]?|"
        r"август[а]?|сентябр[ья]?|октябр[ья]?|ноябр[ья]?|декабр[ья]?)",
        low,
    )
    year_m = re.search(r"(20\d{2})", low)
    if month_m:
        stem = month_m.group(1)
        # подбираем месяц по стему
        for m_num, name in _RU_MONTH_NAME.items():
            if stem.startswith(name[:4]) or name.startswith(stem[:4]):
                out["month"] = m_num
                break
        if out["month"] and year_m:
            out["year"] = int(year_m.group(1))
        elif out["month"]:
            out["year"] = 2026  # дефолт для демо
        return out

    # 3) Квартал: "за 1 квартал 2026", "за II квартал 2026" — ПЕРЕД годом,
    #    иначе year-чек съест «2026» из фразы и мы не развернём в даты
    q_m = re.search(
        r"(\d|перв|втор|трет|четверт)\w*\s*квартал\w*\s*(20\d{2})?", low
    )
    if q_m:
        q_text = q_m.group(0)
        q_year = re.search(r"(20\d{2})", q_text)
        out["year"] = int(q_year.group(1)) if q_year else 2026
        if "перв" in q_text or q_m.group(1) == "1":
            out["date_from"] = f"01.01.{out['year']}"
            out["date_to"] = f"31.03.{out['year']}"
        elif "втор" in q_text or q_m.group(1) == "2":
            out["date_from"] = f"01.04.{out['year']}"
            out["date_to"] = f"30.06.{out['year']}"
        elif "трет" in q_text or q_m.group(1) == "3":
            out["date_from"] = f"01.07.{out['year']}"
            out["date_to"] = f"30.09.{out['year']}"
        elif "четверт" in q_text or q_m.group(1) == "4":
            out["date_from"] = f"01.10.{out['year']}"
            out["date_to"] = f"31.12.{out['year']}"
        return out

    # 3a) «за квартал» без номера — текущий квартал (демо-год 2026)
    if re.search(r"\bза\s+квартал\b|\bквартал\b", low):
        from datetime import date
        today = date.today()
        # в демо фиксируем 2026 — берём 2-й квартал как «текущий»
        year = 2026
        cur_q = 2
        out["year"] = year
        if cur_q == 1:
            out["date_from"] = f"01.01.{year}"
            out["date_to"] = f"31.03.{year}"
        elif cur_q == 2:
            out["date_from"] = f"01.04.{year}"
            out["date_to"] = f"30.06.{year}"
        elif cur_q == 3:
            out["date_from"] = f"01.07.{year}"
            out["date_to"] = f"30.09.{year}"
        else:
            out["date_from"] = f"01.10.{year}"
            out["date_to"] = f"31.12.{year}"
        return out

    # 4) Только год: "за 2026 год", "за год" / "за этот год"
    if re.search(r"за\s+(этот\s+|прошл\w*\s+)?год", low) or re.search(r"\bза\s+год\b", low):
        if year_m:
            out["year"] = int(year_m.group(1))
        else:
            out["year"] = 2026
        return out

    if year_m:
        out["year"] = int(year_m.group(1))
        return out

    return out


# ──────────────────────────────────────────────────────────────────────────────
# Относительные периоды: «за последний месяц», «за последние 14 дней», и т.п.
# Используем ТЕКУЩУЮ дату (datetime.now()), а не якорь демо, чтобы фильтр
# отражал «что значит последний месяц СЕЙЧАС». Демо-данные привязаны к 2026,
# поэтому если today.month/year не совпадают с демо-диапазоном — подменяем
# на ближайший доступный месяц (май 2026 как «последний закрытый»).
# ──────────────────────────────────────────────────────────────────────────────

def _add_months(year: int, month: int, delta: int) -> tuple[int, int]:
    """year/month ± delta.months → (year, month)."""
    idx = (year * 12 + (month - 1)) + delta
    return divmod(idx, 12)[0], divmod(idx, 12)[1] + 1


def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        next_first = datetime(year + 1, 1, 1)
    else:
        next_first = datetime(year, month + 1, 1)
    return (next_first - datetime(year, month, 1)).days


def _parse_relative_period(low: str) -> dict | None:
    """Распарсить «за последний/прошлый/текущий/этот месяц», «за последние N
    дней/недель/месяцев» в диапазон date_from..date_to (dd.mm.yyyy).

    Возвращает dict с date_from/date_to или None, если паттерн не матчит.
    Использует сегодняшнюю дату; если today выходит за пределы демо-периода
    (после 06.2026) — якоримся на 06.2026, чтобы фильтр имел смысл на сидах.
    """
    from datetime import date

    # Якорь: для демо берём 06.06.2026 (последний «настоящий» день выписки),
    # чтобы «последний месяц» = май 2026 (там больше всего данных).
    today_real = date.today()
    demo_anchor = date(2026, 6, 11)  # синхронно с DEMO_STATEMENT_ANCHOR
    today = min(today_real, demo_anchor)

    # «за последний месяц» / «за прошлый месяц» — предыдущий календарный
    if re.search(r"\b(?:за\s+)?(?:последн\w*|прошл\w*)\s+месяц\w*\b", low):
        y, m = _add_months(today.year, today.month, -1)
        last_day = _days_in_month(y, m)
        return {
            "date_from": f"01.{m:02d}.{y}",
            "date_to": f"{last_day:02d}.{m:02d}.{y}",
        }

    # «за текущий месяц» / «за этот месяц» — с 1-го числа по сегодня
    if re.search(r"\b(?:за\s+)?(?:текущ\w*|этот|нынешн\w*)\s+месяц\w*\b", low):
        return {
            "date_from": f"01.{today.month:02d}.{today.year}",
            "date_to": today.strftime("%d.%m.%Y"),
        }

    # «за последние / прошлые N дней/недель/месяцев»
    rel_m = re.search(
        r"\b(?:за\s+)?(?:последн\w*|прошл\w*|истекш\w*)\s+(\d{1,3})\s+"
        r"(дн\w*|дней|день|недел\w*|месяц\w*)\b",
        low,
    )
    if rel_m:
        n = int(rel_m.group(1))
        unit = rel_m.group(2)
        unit_l = unit.lower()
        if unit_l.startswith("дн"):
            from datetime import timedelta
            df = today - timedelta(days=n)
            return {
                "date_from": df.strftime("%d.%m.%Y"),
                "date_to": today.strftime("%d.%m.%Y"),
            }
        if unit_l.startswith("недел"):
            from datetime import timedelta
            df = today - timedelta(weeks=n)
            return {
                "date_from": df.strftime("%d.%m.%Y"),
                "date_to": today.strftime("%d.%m.%Y"),
            }
        if unit_l.startswith("месяц"):
            # N полных месяцев назад по 1-му число → сегодня
            y, m = _add_months(today.year, today.month, -n)
            return {
                "date_from": f"01.{m:02d}.{y}",
                "date_to": today.strftime("%d.%m.%Y"),
            }

    # «за эту / текущую / прошлую неделю» — последние 7 дней
    if re.search(r"\b(?:за\s+)?(?:эту|текущ\w*|прошл\w*|последн\w*)\s+недел\w*\b", low):
        from datetime import timedelta
        df = today - timedelta(days=7)
        return {
            "date_from": df.strftime("%d.%m.%Y"),
            "date_to": today.strftime("%d.%m.%Y"),
        }

    return None


def parse_doc_period(message: str) -> dict:
    """Публичная обёртка: сначала абсолютный парсер, потом относительный.

    Используется ИИ-интентом в `_list_documents_reply` и может вызываться из
    других мест, когда нужно достать фильтр периода из произвольного текста.
    """
    out = _parse_doc_period_from_text(message)
    if out.get("date_from") or out.get("date_to") or out.get("year") or out.get("month"):
        return out
    rel = _parse_relative_period(message.lower())
    if rel:
        out.update(rel)
    return out


def _normalize_date_token(token: str | None) -> str | None:
    """Привести дату к dd.mm.yyyy."""
    if not token:
        return None
    t = token.replace("/", ".").strip()
    parts = t.split(".")
    if len(parts) == 2:
        # dd.mm — добавим дефолтный год
        return f"{parts[0].zfill(2)}.{parts[1].zfill(2)}.2026"
    if len(parts) == 3:
        d, m, y = parts
        if len(y) == 2:
            y = f"20{y}"
        return f"{d.zfill(2)}.{m.zfill(2)}.{y}"
    return None


def _build_documents_query_string(filters: dict) -> str:
    parts: list[str] = []
    if filters.get("status"):
        parts.append(f"status={quote(filters['status'])}")
    if filters.get("statuses"):
        parts.append(f"statuses={quote(','.join(filters['statuses']))}")
    if filters.get("year"):
        parts.append(f"year={filters['year']}")
    if filters.get("month"):
        parts.append(f"month={filters['month']}")
    if filters.get("date_from"):
        parts.append(f"date_from={quote(filters['date_from'])}")
    if filters.get("date_to"):
        parts.append(f"date_to={quote(filters['date_to'])}")
    if filters.get("counterparty"):
        parts.append(f"counterparty={quote(filters['counterparty'])}")
    if filters.get("q"):
        parts.append(f"q={quote(filters['q'])}")
    if filters.get("doc_type"):
        parts.append(f"doc_type={quote(filters['doc_type'])}")
    if filters.get("min_amount") is not None:
        parts.append(f"min_amount={filters['min_amount']}")
    if filters.get("max_amount") is not None:
        parts.append(f"max_amount={filters['max_amount']}")
    return "&".join(parts)


async def _open_document_by_number_reply(
    session: AsyncSession, message: str, org_id: str
) -> dict | None:
    """«Открой документ номер 97» / «покажи документ №97» — карточка и переход к просмотру."""
    from services.banking.search import _parse_doc_number

    low = message.lower()
    if not re.search(r"документ\w*", low):
        return None
    if not re.search(
        r"(?:откро\w*|покаж\w*|открыть|показать|найди|найти|открой|покажи|дай|выведи)\b",
        low,
    ):
        return None
    doc_num = _parse_doc_number(message)
    if not doc_num:
        return None
    # Множественное «документы» без явного номера — это список, не один документ.
    if re.search(r"документы", low) and not re.search(r"(?:номер\w*|№)\s*№?\s*\d", low):
        return None

    result = await session.execute(
        select(BankDocument).where(BankDocument.org_id == org_id)
    )
    rows = result.scalars().all()
    exact = [d for d in rows if (d.doc_number or "").strip() == doc_num]
    if not exact:
        exact = [d for d in rows if doc_num in (d.doc_number or "")]
    if not exact:
        return {
            "message": (
                f"Документ № **{doc_num}** не найден в журнале.\n\n"
                "Попробуйте уточнить номер или откройте список всех документов."
            ),
            "action_buttons": [
                {"label": "Все документы", "url": f"/other/documents?q={quote(doc_num)}", "variant": "primary"},
            ],
            "suggested_chips": [f"Найди документ {doc_num}", "Покажи все документы"],
        }

    doc = exact[0]
    url = document_view_url(doc.id)
    purpose = (doc.purpose or "").strip()
    purpose_line = f"\n{purpose}" if purpose else ""
    return {
        "message": (
            f"Документ № **{doc.doc_number}** — **{doc.counterparty}**: "
            f"**{doc.amount:,.2f} {doc.currency}**, статус «{doc.status}»."
            f"{purpose_line}"
        ),
        "sources": [
            {
                "index": 1,
                "label": f"Источник 1: № {doc.doc_number} — {doc.counterparty}",
                "kind": "document",
                "id": doc.id,
                "url": url,
            }
        ],
        "ui_actions": [{"type": "navigate", "target": url}],
        "action_buttons": [
            {"label": "Открыть документ", "url": url, "variant": "primary"},
            {"label": "Связанные платежи", "message": f"Платежи {doc.counterparty}", "variant": "secondary"},
            {"label": "Все документы", "url": "/other/documents", "variant": "secondary"},
        ],
    }


async def _list_documents_reply(
    session: AsyncSession, message: str, org_id: str
) -> dict | None:
    """AI-интент: «покажи все документы / за год / за март / с 01.01 по 31.03 / на подпись»."""
    low = message.lower()
    if is_banking_document_command(message) and re.search(
        r"документ\b(?!ы)", low
    ) and re.search(r"(?:номер\w*|№)\s*№?\s*\d", low):
        return None
    # Триггеры:
    #   1) «документы» + глагол действия (покажи/найди/открой/…)
    #   2) «документы за/на/по/с/между <период|статус|контрагент>» — без глагола
    #   3) «документы на подпись» / «документы за 2026» — типичный разговорный
    has_doc = bool(re.search(r"документ\w*|журнал\w*|реестр\w*", low))
    if not has_doc:
        return None
    has_action = bool(
        re.search(
            r"покажи|показать|открой|открыть|дай|выведи|вывести|список\w*|"
            r"перейди|хочу\s+посмотреть|хочу\s+увидеть|хочу\s+открыть|"
            r"найди|найти|поищи|ищи|посмотр\w*",
            low,
        )
    )
    # Без явного глагола — но есть «документы» + контекст периода/контрагента/статуса
    has_period = bool(
        re.search(
            r"за\s+(?:\d{4}|этот\s+год|прошл\w*\s+год|январ|феврал|март|апрел|ма[йя]|"
            r"июн|июл|август|сентябр|октябр|ноябр|декабр|квартал)|"
            r"с\s+\d{1,2}\.\d{1,2}|"
            rf"(?:с|от)\s+({_RU_MONTH_STEMS})\s*(?:по|до)|"
            r"на\s+подпис|ожида\w+\s+подпис|"
            r"подписан\w+|проведен\w+|исполнен\w+|черновик|отказан\w+|"
            r"сумм\w*|контрагент|от\s+\d|более|больше|руб|byn",
            low,
        )
    )
    if not (has_action or has_period):
        return None

    filters: dict = {}
    period = parse_doc_period(message)
    if period.get("year"):
        filters["year"] = period["year"]
    if period.get("month"):
        filters["month"] = period["month"]
    if period.get("date_from"):
        filters["date_from"] = period["date_from"]
    if period.get("date_to"):
        filters["date_to"] = period["date_to"]

    # Статус из текста
    if re.search(r"на\s+подпис\w*|ожида\w*\s+подпис\w*|не\s+подпис\w*", low):
        filters["status"] = "На подписи"
    elif re.search(r"подписан\w*|подпис\w+\s+документ", low):
        filters["status"] = "Подписан"
    elif re.search(r"в\s+обработк\w*|обрабатыв\w*|обработк\w+", low):
        filters["status"] = "В обработке"
    elif re.search(r"проведен\w*|исполнен\w*|оплачен\w*|заверш\w+", low):
        filters["status"] = "Проведен"
    elif re.search(r"отказан\w*|отклон\w*|отмен\w+", low):
        filters["status"] = "Отказан"
    elif re.search(r"черновик\w*|не\s+заверш\w*", low):
        filters["status"] = "Черновик"
    elif re.search(r"удал\w+", low):
        filters["status"] = "Удален"

    # Контрагент: "документы ООО Ромашка" / "с контрагентом ООО Ромашка"
    cp_match = re.search(
        r"документ\w*\s+(?:у|от|по|для|контрагент\w*|поставщик\w*)?\s*"
        r"([А-ЯЁа-яё0-9«»\"\']{3,}(?:\s+[А-ЯЁа-яё0-9]{3,})?)(?:\s+за\s+|\s+на\s+|$|\.)",
        message,
    )
    if not cp_match:
        cp_match = re.search(
            r"документ\w*\s+(?:с\s+)?контрагент\w*\s+"
            r"([А-ЯЁа-яё0-9«»\"\']{3,}(?:\s+[А-ЯЁа-яё0-9«»\"\']{2,})?)",
            message,
            re.I,
        )
    if cp_match:
        candidate = cp_match.group(1).strip(" .,")
        if candidate.lower() not in {
            "за", "на", "по", "у", "от", "для", "все", "всех", "этот", "этого", "месяц", "год", "период"
        }:
            # Не подставляем в фильтр, если это просто «документы за 2026» — там cp_match не сработает
            if not re.match(r"^\d{4}$", candidate) and not re.search(
                r"январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр",
                candidate.lower(),
            ):
                filters["counterparty"] = candidate

    # Прямой поиск по слову/номеру: «найди документ 211», «покажи счёт 555»
    from services.banking.search import _parse_doc_number

    doc_num = _parse_doc_number(message)
    if doc_num and re.search(r"документ\w*", low):
        filters["q"] = doc_num
    elif "найди" in low or "найти" in low:
        num_m = re.search(r"\b(\d{2,6})\b", message)
        if num_m and num_m.group(1) not in (str(filters.get("year") or ""),):
            filters["q"] = num_m.group(1)

    # Диапазон суммы: «суммой от 1000 до 5000», «больше 1000», «меньше 5000»,
    # «от 1000», «до 5000», «сумма > 1000». BYN по умолчанию.
    def _to_amount(raw: str) -> float | None:
        try:
            return float(raw.replace(",", ".").replace(" ", ""))
        except (ValueError, AttributeError):
            return None

    range_m = re.search(
        r"(?:сумм\w*\s*)?(?:от|более|больше|>=?|свыше)\s*(\d+(?:[.,]\d+)?)"
        r"\s*(?:до|и\s+до|меньше|<=?|до)\s*(\d+(?:[.,]\d+)?)",
        low,
    )
    if range_m:
        v1, v2 = _to_amount(range_m.group(1)), _to_amount(range_m.group(2))
        if v1 is not None and v2 is not None:
            filters["min_amount"], filters["max_amount"] = min(v1, v2), max(v1, v2)
    else:
        gt_m = re.search(
            r"(?:сумм\w*\s*)?(?:от|более|больше|>=?|свыше)\s*(\d+(?:[.,]\d+)?)(?!\s*(?:до|до\s|и\s+до|меньше|<=?))",
            low,
        )
        if gt_m:
            v = _to_amount(gt_m.group(1))
            if v is not None:
                filters["min_amount"] = v
        lt_m = re.search(
            r"(?:сумм\w*\s*)?(?:до|меньше|<=?)\s*(\d+(?:[.,]\d+)?)(?!\s*(?:от|более|больше|>=?|свыше))",
            low,
        )
        if lt_m:
            v = _to_amount(lt_m.group(1))
            if v is not None:
                filters["max_amount"] = v

    # Тип документа: «платёжные поручения», «информационные запросы», «запросы выписки»
    if re.search(r"плат[её]жн\w*\s+поручен\w*|поручен\w*", low):
        filters["doc_type"] = "Платёжное поручение"
    elif re.search(r"информац\w*\s+запрос\w*|запрос\w*\s+выписк\w*|запрос\w*\s+информац\w*", low):
        filters["doc_type"] = "INFO:"

    # Считаем сколько доков попадёт под фильтры — для подсказки «найдено N»
    count_stmt = select(BankDocument).where(BankDocument.org_id == org_id)
    if filters.get("status"):
        count_stmt = count_stmt.where(BankDocument.status == filters["status"])
    if filters.get("year") and filters.get("month"):
        mm = f"{filters['month']:02d}"
        count_stmt = count_stmt.where(
            BankDocument.doc_date.like(f"%.{mm}.{filters['year']}")
        )
    elif filters.get("year"):
        count_stmt = count_stmt.where(
            BankDocument.doc_date.like(f"%.{filters['year']}")
        )
    # date_from / date_to хранятся как dd.mm.yyyy; лексикографический
    # порядок совпадает с хронологическим, пока год один. Для нашего демо
    # (диапазон ≤ 1 год) это работает корректно. Если в будущем понадобится
    # кросс-годовая фильтрация — заменим на преобразование через _to_iso_date.
    if filters.get("date_from"):
        count_stmt = count_stmt.where(BankDocument.doc_date >= filters["date_from"])
    if filters.get("date_to"):
        count_stmt = count_stmt.where(BankDocument.doc_date <= filters["date_to"])
    if filters.get("min_amount") is not None:
        count_stmt = count_stmt.where(BankDocument.amount >= filters["min_amount"])
    if filters.get("max_amount") is not None:
        count_stmt = count_stmt.where(BankDocument.amount <= filters["max_amount"])
    if filters.get("doc_type"):
        if filters["doc_type"].endswith(":"):
            count_stmt = count_stmt.where(
                BankDocument.doc_type.like(filters["doc_type"] + "%")
            )
        else:
            count_stmt = count_stmt.where(BankDocument.doc_type == filters["doc_type"])
    rows = (await session.execute(count_stmt)).scalars().all()
    if filters.get("counterparty"):
        cpf = filters["counterparty"].lower()
        rows = [r for r in rows if cpf in (r.counterparty or "").lower()]
    if filters.get("q"):
        qq = filters["q"].lower()
        rows = [
            r for r in rows
            if qq in (r.doc_number or "").lower()
            or qq in (r.purpose or "").lower()
            or qq in (r.counterparty or "").lower()
        ]
    found = len(rows)

    qs = _build_documents_query_string(filters)
    url = "/other/documents" + (f"?{qs}" if qs else "")

    # Сборка красивого текста-подсказки
    pretty_filters: list[str] = []
    if filters.get("year") and filters.get("month"):
        pretty_filters.append(
            f"за {_RU_MONTH_NAME[filters['month']]} {filters['year']}"
        )
    elif filters.get("year"):
        pretty_filters.append(f"за {filters['year']} год")
    if filters.get("status"):
        pretty_filters.append(f"статус «{filters['status']}»")
    if filters.get("counterparty"):
        pretty_filters.append(f"контрагент «{filters['counterparty']}»")
    if filters.get("q"):
        pretty_filters.append(f"поиск «{filters['q']}»")
    if filters.get("doc_type"):
        pretty_filters.append(f"тип «{filters['doc_type']}»")
    if filters.get("min_amount") is not None or filters.get("max_amount") is not None:
        lo = filters.get("min_amount")
        hi = filters.get("max_amount")
        if lo is not None and hi is not None:
            pretty_filters.append(f"сумма {lo:,.0f}–{hi:,.0f}")
        elif lo is not None:
            pretty_filters.append(f"сумма ≥ {lo:,.0f}")
        else:
            pretty_filters.append(f"сумма ≤ {hi:,.0f}")

    if pretty_filters:
        filter_label = " · ".join(pretty_filters)
        msg = f"Открываю список документов ({filter_label})."
    else:
        filter_label = ""
        msg = "Открываю список всех документов."

    if found == 0:
        msg += "\n\nПока нет документов под выбранные фильтры — но открою страницу, чтобы было видно."
    elif found <= 30:
        msg += f"\n\nПод фильтры попадает **{found}** документов."
    else:
        msg += f"\n\nПод фильтры попадает **{found}** документов — при необходимости уточните период или контрагента."

    buttons: list[dict] = [
        {"label": "Открыть документы", "url": url, "variant": "primary"},
    ]
    if filters.get("year") and not filters.get("month"):
        buttons.append({
            "label": f"За {filters['year']} год по месяцам",
            "message": f"Покажи документы за {_RU_MONTH_NAME[1]} {filters['year']}",
            "variant": "secondary",
        })

    return {
        "message": msg,
        "sources": [
            {
                "index": 1,
                "label": f"Источник 1: Журнал документов{(' — ' + filter_label) if filter_label else ''}",
                "kind": "documents",
                "url": url,
            }
        ],
        "ui_actions": [{"type": "navigate", "target": url}],
        "action_buttons": buttons,
        "suggested_chips": [
            "Покажи все документы",
            "Документы на подпись",
            "Документы за март 2026",
            "Документы за 2026 год",
        ] if not (filters.get("year") or filters.get("status")) else None,
    }


async def _account_note_reply(
    session: AsyncSession, message: str, org_id: str
) -> dict | None:
    """«Измени заметку счёта 2222 на "основной"» / «переименуй счёт крутой в резервный»."""
    low = message.lower()
    if not re.search(r"заметк|переимен\w+\s+сч[её]т|подпиш\w+\s+сч[её]т", low):
        return None

    result = await session.execute(
        select(BankAccount).where(BankAccount.org_id == org_id, BankAccount.hidden.is_(False))
    )
    accounts = list(result.scalars().all())
    if not accounts:
        return None

    # Новый текст заметки: в кавычках, либо после «на/в» в конце фразы
    new_note: str | None = None
    m = re.search(r"[«\"']([^«»\"']{1,60})[»\"']", message)
    if m:
        new_note = m.group(1).strip()
    else:
        m = re.search(r"\s(?:на|в)\s+([^.!?]{1,60})[.!?]?\s*$", message, re.IGNORECASE)
        if m:
            new_note = m.group(1).strip()

    # Счёт: по 4 последним цифрам IBAN, затем по текущей заметке/названию
    target: BankAccount | None = None
    digits = set(re.findall(r"\d{4}", message))
    for acc in accounts:
        tail = re.sub(r"\D", "", acc.iban)[-4:]
        if tail and tail in digits:
            target = acc
            break
    if not target:
        for acc in accounts:
            lbl = (acc.label or acc.note or "").strip().lower()
            if lbl and lbl in low and (not new_note or lbl != new_note.lower()):
                target = acc
                break
    if not target and len(accounts) == 1:
        target = accounts[0]

    if not target or not new_note:
        listing = "\n".join(
            f"• …{re.sub(r'[^0-9]', '', a.iban)[-4:]} ({a.currency}) — «{a.label or a.note or 'без заметки'}»"
            for a in accounts[:6]
        )
        return {
            "message": (
                "Могу изменить заметку счёта. Уточните счёт и новый текст, например: "
                "«измени заметку счёта 2222 на \"основной\"».\n\nВаши счета:\n" + listing
            ),
            "suggested_chips": ["Измени заметку счёта 2222 на \"основной\""],
        }

    old = target.label or target.note or "без заметки"
    target.label = new_note
    target.note = new_note
    await session.commit()

    tail = re.sub(r"\D", "", target.iban)[-4:]
    return {
        "message": (
            f"Готово! Заметка счёта **…{tail} ({target.currency})** изменена: "
            f"«{old}» → **«{new_note}»**. Изменения сохранены."
        ),
        "ui_actions": [{"type": "click", "target": "reload-banking"}],
        "action_buttons": [
            {"label": "Деньги и события", "url": "/", "variant": "primary"},
        ],
        "severity": "success",
    }


async def handle_banking_query(
    session: AsyncSession, message: str, org_id: str = "demo", session_id: str | None = None
) -> dict | None:
    from services.chat.session_sources import get_source
    from services.banking.counterparty_risk import format_risk_report, get_counterparty_risk
    from services.tax.calendar import demo_fszh_amount, format_tax_calendar_reply, get_tax_calendar
    from services.onec.assistant import is_onec_query
    import uuid as _uuid

    # 1С — отдельный домен с собственным обработчиком (handle_onec_query).
    # Если сообщение про 1С — сразу выходим, чтобы banking-пайплайн не
    # перехватывал его через smart_search («покажи данные из 1С» иначе уйдёт
    # в общий поиск контрагентов/документов и вернёт «ничего не найдено»).
    if is_onec_query(message):
        return None

    low = message.lower()

    note_reply = await _account_note_reply(session, message, org_id)
    if note_reply:
        return note_reply

    statement_reply = await _statement_reply(session, message, org_id)
    if statement_reply:
        return statement_reply

    open_doc_reply = await _open_document_by_number_reply(session, message, org_id)
    if open_doc_reply:
        return open_doc_reply

    documents_reply = await _list_documents_reply(session, message, org_id)
    if documents_reply:
        return documents_reply

    if re.search(r"подпиш\w+.*шлюз|отправ\w+.*шлюз|подписать\s+и\s+отправ", low):
        from services.banking.gateway_sim import sign_latest_and_submit

        pair = await sign_latest_and_submit(session, org_id)
        if pair:
            doc, gp = pair
            return {
                "message": (
                    f"Документ **{doc.doc_number}** подписан (демо) и отправлен в платёжный шлюз.\n"
                    f"Статус шлюза: **{gp.status}** — {gp.status_message}"
                ),
                "action_buttons": [
                    {"label": "Статус шлюза", "url": "/payments", "variant": "primary"},
                    {"label": "Выписка", "url": "/statement/account", "variant": "secondary"},
                ],
                "severity": "success",
            }
        return {
            "message": "Нет документов «На подписи». Создайте платёж через форму или чат.",
            "action_buttons": [
                {"label": "Создать платёж", "url": "/payments/paydocbyn", "variant": "primary"},
            ],
        }

    source_match = re.search(r"источник\s*№?\s*(\d+)", message.lower())
    if source_match:
        idx = int(source_match.group(1))
        src = get_source(session_id, idx) if session_id else None
        if src:
            kind = src.get("kind", "document")
            doc_id = src.get("id")
            highlight = src.get("highlight_fields") or ["amount", "counterparty", "purpose"]
            if kind in ("document", "payment", "report") and doc_id:
                doc = await session.get(BankDocument, doc_id)
                if doc:
                    url = document_view_url(doc.id)
                    is_report = doc.doc_type.startswith("INFO:") or kind == "report"
                    return {
                        "message": (
                            f"**Источник {idx}:** {doc.doc_number} от {doc.doc_date}\n"
                            f"{'Вид' if is_report else 'Контрагент'}: {doc.counterparty if not is_report else doc.doc_type.replace('INFO:', '')}\n"
                            f"{f'Сумма: **{doc.amount:,.2f}** {doc.currency}\n' if doc.amount else ''}"
                            f"Назначение: {doc.purpose}\n"
                            f"Статус: {doc.status}\n\n"
                            f"Открываю {'отчёт' if is_report else 'документ'}."
                        ),
                        "sources": [
                            {
                                "index": idx,
                                "label": f"Источник {idx}: {doc.doc_number}",
                                "kind": "report" if is_report else kind,
                                "id": doc.id,
                                "url": url,
                                "highlight_fields": highlight if not is_report else None,
                            }
                        ],
                        "ui_actions": [{"type": "navigate", "target": url}],
                        "action_buttons": [
                            {"label": "Открыть отчёт" if is_report else "Открыть документ", "url": url, "variant": "primary"},
                            {"label": "Выписка", "url": "/statement/account", "variant": "secondary"},
                        ],
                    }
            if kind == "counterparty" and doc_id:
                cp = await session.get(Counterparty, doc_id)
                if cp:
                    url = f"/services/counterparty?cp={cp.id}"
                    return {
                        "message": f"**Источник {idx}:** контрагент {cp.name}, УНП {cp.unp}.",
                        "sources": [{"index": idx, "label": cp.name, "kind": "counterparty", "id": cp.id, "url": url}],
                        "ui_actions": [{"type": "navigate", "target": url}],
                    }
            if kind in ("analytics", "account", "service", "onec"):
                url = src.get("url") or "/services"
                return {
                    "message": f"**Источник {idx}:** {src.get('label', 'данные')}. Открываю раздел.",
                    "sources": [src],
                    "ui_actions": [{"type": "navigate", "target": url}],
                    "action_buttons": [{"label": "Открыть", "url": url, "variant": "primary"}],
                }
        # Fallback: search by index in last registered sources only
        return {
            "message": f"Источник №{idx} не найден в текущей сессии. Задайте вопрос снова — например, «найди платежи Иванова».",
            "suggested_chips": ["Найди платежи Иванова за март", "Сколько на счёте?"],
        }

    if re.search(r"налогов\w*\s+календар|календар\w*\s+налог|срок\w*\s+(?:фсзн|ндс|налог)", low):
        org = await session.get(OrganizationProfile, org_id)
        items = await get_tax_calendar(session, org_id)
        name = org.org_name if org else "организация"
        role = org.user_role if org else "businessman"
        return {
            "message": format_tax_calendar_reply(items, name, role),
            "sources": [{"index": 1, "label": "Календарь обязательств", "kind": "tax", "url": "/salary/obligations"}],
            "action_buttons": [
                {"label": "Обязательства", "url": "/salary/obligations", "variant": "primary"},
                {"label": "Рассчитать ФСЗН", "message": "Рассчитай взносы ФСЗН", "variant": "secondary"},
            ],
        }

    if re.search(r"рассчит\w*\s+фсзн|взнос\w*\s+фсзн|сколько\s+фсзн", low):
        amt = demo_fszh_amount(5000.0)
        return {
            "message": f"Демо-расчёт ФСЗН при базе 5 000 BYN: **{amt:,.2f} BYN** (≈34% работодателя).\n\nДля точного расчёта укажите фонд оплаты труда.",
            "action_buttons": [
                {"label": "Зарплатный проект", "url": "/salary", "variant": "primary"},
                {"label": "Налоговый календарь", "message": "Налоговый календарь", "variant": "secondary"},
            ],
        }

    if re.search(r"провер\w*\s+контрагент|благонадёжност|due\s+diligence|риск.?\s+скор", low):
        name_m = re.search(r"(?:контрагент\w*|поставщик\w*)\s+(.+)", message, re.I)
        query = normalize_counterparty_query(name_m.group(1) if name_m else message)
        for token in ["проверь", "проверить", "благонадёжность", "риск", "скор", "due diligence"]:
            query = re.sub(re.escape(token), "", query, flags=re.I).strip()
        query = normalize_counterparty_query(query)

        if not query:
            # Без имени — спрашиваем и предлагаем чипы с реальными
            # контрагентами из реестра (раньше был захардкоженный «Ромашка»,
            # что давало фейковый ответ).
            cps = (
                await session.execute(
                    select(Counterparty).where(Counterparty.org_id == org_id).limit(5)
                )
            ).scalars().all()
            chips = [f"Проверь контрагента {c.name}" for c in cps][:4]
            listing = "\n".join(f"• {c.name} (УНП {c.unp or '—'})" for c in cps)
            return {
                "message": (
                    "Уточните, какого контрагента проверить. "
                    "Например: «Проверь контрагента ООО Ромашка».\n\n"
                    f"Ваши контрагенты:\n{listing}"
                ),
                "suggested_chips": chips or ["Проверь контрагента ООО Ромашка"],
                "action_buttons": [
                    {"label": "Все контрагенты", "url": "/payments/counterparties", "variant": "secondary"},
                ],
            }

        risk = await get_counterparty_risk(session, org_id, query)
        if risk:
            return {
                "message": format_risk_report(risk),
                "sources": [
                    {
                        "index": 1,
                        "label": f"Реестр: {risk['name']}",
                        "kind": "counterparty",
                        "id": risk["id"],
                        "url": f"/services/counterparty?cp={risk['id']}",
                    }
                ],
                "action_buttons": [
                    {"label": "Карточка контрагента", "url": f"/services/counterparty?cp={risk['id']}", "variant": "primary"},
                ],
            }

        # Имя не нашлось — даём подсказки: похожие имена + «добавить».
        all_cps = (
            await session.execute(
                select(Counterparty).where(Counterparty.org_id == org_id)
            )
        ).scalars().all()
        low_q = query.lower()
        suggestions = [
            c for c in all_cps
            if any(tok in c.name.lower() for tok in low_q.split() if len(tok) >= 3)
        ][:3]
        suggestion_lines = "\n".join(f"• {c.name} (УНП {c.unp or '—'})" for c in suggestions) or "— нет похожих —"
        return {
            "message": (
                f"Не нашёл «{query}» в вашем справочнике.\n\n"
                f"Возможно, вы имели в виду:\n{suggestion_lines}\n\n"
                "Уточните имя или добавьте нового контрагента."
            ),
            "suggested_chips": [f"Проверь контрагента {s.name}" for s in suggestions]
            + [f"Добавь контрагента {query}"],
            "action_buttons": [
                {"label": "Все контрагенты", "url": "/payments/counterparties", "variant": "secondary"},
            ],
        }

    if re.search(r"добав\w*\s+контрагент", low):
        name_m = re.search(r"контрагент\w*\s+(.+)", message, re.I)
        name = (name_m.group(1).strip() if name_m else "").strip("«»\"'")
        if len(name) >= 3:
            existing = await session.execute(
                select(Counterparty).where(Counterparty.org_id == org_id, Counterparty.name.ilike(f"%{name}%"))
            )
            if existing.scalar_one_or_none():
                return {"message": f"Контрагент «{name}» уже есть в справочнике.", "action_buttons": [{"label": "Контрагенты", "url": "/payments/counterparties", "variant": "primary"}]}
            cp = Counterparty(id=str(_uuid.uuid4()), org_id=org_id, name=name, risk_score=55.0, risk_level="medium", risk_notes="Добавлен из чата — проверьте УНП и счёт.")
            session.add(cp)
            await session.commit()
            return {
                "message": f"Контрагент **{name}** добавлен в справочник (демо). Укажите УНП и счёт в карточке или через OCR счёта.",
                "action_buttons": [
                    {"label": "Открыть контрагентов", "url": "/payments/counterparties", "variant": "primary"},
                    {"label": "Заполнить из счёта", "message": "Помоги заполнить реквизиты контрагента", "variant": "secondary"},
                ],
            }
        return {
            "message": "Напишите, например: «Добавь контрагента ООО Новый Партнёр».",
            "pending_form_fields": ["Название", "УНП", "Счёт IBAN"],
        }

    if re.search(r"риск\w*|опасност|аномал|проблем\w*\s+с\s+расход", low):
        data = await cash_gap_forecast(session, org_id)
        severity = "critical" if data.get("days_to_gap", 99) < 7 else "warn"
        return {
            "message": (
                f"⚠️ **Анализ рисков (демо):**\n"
                f"• Кассовый разрыв возможен через ~{data.get('days_to_gap', '?')} дн.\n"
                f"• Средний отток: {data.get('avg_monthly_outflow', 0):,.0f} BYN/мес\n"
                f"• Рекомендация: проверьте крупные платежи на подписи и резерв на счёте."
            ),
            "severity": severity,
            "charts": [to_chart_line("Прогноз остатка", data["forecast"])],
            "sources": [{"index": 1, "label": "Аналитика рисков", "kind": "analytics", "url": "/services/analytics"}],
        }

    if is_notification_query(message):
        notif_reply = await handle_notification_query(session, message, org_id)
        if notif_reply:
            return notif_reply

    low = message.lower()

    if re.search(r"последн\w*\s+документ|последн\w*\s+плат[её]ж", low):
        result = await session.execute(
            select(BankDocument)
            .where(BankDocument.org_id == org_id)
            .order_by(BankDocument.doc_date.desc())
            .limit(5)
        )
        docs = result.scalars().all()
        if docs:
            lines = [
                f"{i}. {d.doc_number} — {d.counterparty} — {d.amount:,.2f} {d.currency} ({d.status})"
                for i, d in enumerate(docs, 1)
            ]
            return {
                "message": "Последние документы:\n" + "\n".join(lines),
                "sources": [
                    {
                        "index": i,
                        "label": f"Источник {i}: {d.doc_number} — {d.counterparty}",
                        "kind": "document",
                        "id": d.id,
                        "url": document_view_url(d.id),
                    }
                    for i, d in enumerate(docs, 1)
                ],
                "action_buttons": [
                    {"label": "Все документы", "url": "/other/documents", "variant": "primary"},
                    {"label": "Выписка", "url": "/statement", "variant": "secondary"},
                ],
            }

    if re.search(r"реквизит", low):
        query = re.sub(r"реквизит\w*|покажи|контрагент\w*|клиент\w*", "", message, flags=re.I).strip()
        cp = await lookup_counterparty(session, org_id, query)
        if cp:
            return {
                "message": (
                    f"Реквизиты **{cp.name}**:\n"
                    f"УНП: **{cp.unp or 'не указан'}**\n"
                    f"Счёт: **{cp.account or 'не указан'}**\n"
                    f"Банк: {cp.bank_name or 'не указан'}"
                ),
                "sources": [
                    {
                        "index": 1,
                        "label": f"Источник 1: {cp.name}",
                        "kind": "counterparty",
                        "id": cp.id,
                        "url": f"/services/counterparty?cp={cp.id}",
                    }
                ],
                "action_buttons": [
                    {"label": "Карточка контрагента", "url": f"/services/counterparty?cp={cp.id}", "variant": "primary"},
                    {"label": "Создать платёж", "message": f"Создай платёжку для {cp.name}", "variant": "secondary"},
                ],
            }
        return {
            "message": "Контрагент не найден. Уточните название или УНП, например: «Реквизиты ООО АльфаИнвест».",
            "suggested_chips": ["Реквизиты ООО АльфаИнвест", "Реквизиты ООО Ромашка"],
        }

    if re.search(r"заплат\w*\s+аренд|оплат\w*\s+аренд", low):
        cp = await lookup_counterparty(session, org_id, "АльфаИнвест")
        return {
            "message": (
                "Подготовлю платёж по аренде. Открываю форму платежа в BYN; "
                "получателя и назначение можно заполнить одной командой."
            ),
            "ui_actions": [{"type": "navigate", "target": "/payments/paydocbyn"}],
            "action_buttons": [
                {
                    "label": "Заполнить аренду",
                    "message": f"Получатель {cp.name if cp else 'ООО АльфаИнвест'}, сумма 8900, назначение аренда офиса за текущий месяц",
                    "variant": "primary",
                },
                {"label": "Открыть форму", "url": "/payments/paydocbyn", "variant": "secondary"},
            ],
        }

    if re.search(r"созда\w*\s+сч[её]т\s+для", low):
        name = re.sub(r".*созда\w*\s+сч[её]т\s+для", "", message, flags=re.I).strip(" .")
        cp = await lookup_counterparty(session, org_id, name) if name else None
        target = cp.name if cp else (name or "контрагента")
        return {
            "message": (
                f"Подготовлю счёт для **{target}**. В демо открою раздел документов; "
                "далее можно создать платёжное требование или счёт на оплату."
            ),
            "action_buttons": [
                {"label": "Открыть документы", "url": "/other/documents", "variant": "primary"},
                {"label": "Реквизиты контрагента", "message": f"Реквизиты {target}", "variant": "secondary"},
            ],
        }

    create_payment_match = re.search(
        r"созда\w*\s+плат[её]жк?\w*(?:\s+на\s+([\d\s.,]+)\s*(byn|руб|бел\.?\s*руб\.?)?)?(?:\s+для\s+(.+))?",
        message,
        re.I,
    )
    if create_payment_match:
        amount = (create_payment_match.group(1) or "").strip()
        name = (create_payment_match.group(3) or "").strip(" .")
        cp = await lookup_counterparty(session, org_id, name) if name else None
        fill_parts = []
        if cp:
            fill_parts.append(f"Получатель {cp.name}")
        elif name:
            fill_parts.append(f"Получатель {name}")
        if amount:
            fill_parts.append(f"сумма {amount}")
        fill_hint = ", ".join(fill_parts) or "Помоги заполнить форму"
        return {
            "message": "Открываю платёжное поручение в BYN. После открытия формы продолжу заполнение из чата.",
            "ui_actions": [{"type": "navigate", "target": "/payments/paydocbyn"}],
            "action_buttons": [
                {"label": "Заполнить поля", "message": fill_hint, "variant": "primary"},
                {"label": "Открыть форму", "url": "/payments/paydocbyn", "variant": "secondary"},
            ],
        }

    if re.search(r"отложенн\w*\s+плат[её]ж|плат[её]ж\s+на\s+\d{1,2}\s+[а-я]+", low):
        date_m = re.search(r"(\d{1,2}\s+[а-яё]+)", low)
        date_text = date_m.group(1) if date_m else "указанную дату"
        return {
            "message": f"Создам отложенный платёж на **{date_text}**. Открываю форму, дату исполнения нужно проверить перед отправкой.",
            "ui_actions": [{"type": "navigate", "target": "/payments/paydocbyn"}],
            "action_buttons": [
                {"label": "Открыть форму", "url": "/payments/paydocbyn", "variant": "primary"},
                {"label": "Показать календарь платежей", "url": "/statement", "variant": "secondary"},
            ],
        }

    if re.search(r"что\s+надо\s+заплат|что\s+нужно\s+заплат|обязательн\w*\s+плат[её]ж", low):
        return {
            "message": (
                "В этом месяце в демо-данных важны: НДС/подоходный налог, ФСЗН, аренда офиса "
                "и документы «На подписи». Откройте календарь обязательств или список напоминаний."
            ),
            "action_buttons": [
                {"label": "Налоговый календарь", "message": "Налоговый календарь", "variant": "primary"},
                {"label": "Что на подписи?", "message": "Что на подписи?", "variant": "secondary"},
                {"label": "Создать платёж", "url": "/payments/paydocbyn", "variant": "secondary"},
            ],
        }

    if re.search(r"итог\w*\s+(?:прошл\w*\s+недел|недел|месяц)", low):
        data = await cash_gap_forecast(session, org_id)
        return {
            "message": (
                "Краткие итоги периода (демо):\n"
                f"• Текущий остаток: **{data['current_balance']:,.2f} BYN**\n"
                f"• Средний месячный отток: {data['avg_monthly_outflow']:,.2f} BYN\n"
                f"• Риск кассового разрыва: примерно через {data['days_to_gap']} дн."
            ),
            "charts": [to_chart_line("Прогноз остатка", data["forecast"])],
            "action_buttons": [
                {"label": "Расходы за март", "message": "Расходы за 2026-03", "variant": "primary"},
                {"label": "Выписка за месяц", "url": "/statement?period=month", "variant": "secondary"},
            ],
        }

    if re.search(r"кто\s+из\s+контрагент\w*\s+не\s+заплат", low):
        return {
            "message": (
                "В демо-данных нет отдельного реестра дебиторской задолженности. "
                "По истории операций можно проверить задержки постоянных контрагентов: "
                "откройте выписку за период и карточки контрагентов."
            ),
            "action_buttons": [
                {"label": "Выписка за апрель", "url": "/statement?period=month", "variant": "primary"},
                {"label": "Контрагенты", "url": "/services/counterparty", "variant": "secondary"},
            ],
        }

    # Универсальный обработчик «покажи график / диаграмму» — если ИИ явно
    # просят график, но не уточняют тип, выдаём каталог доступных визуализаций
    # и сразу рисуем самый полезный (прогноз остатка).
    if re.search(r"\b(график|диаграмм|визуализ|визуализир|chart)\b", low) and not re.search(
        r"расход|сравни|кассов|разрыв|прогноз|остатк|баланс", low
    ):
        forecast = await cash_gap_forecast(session, org_id)
        return {
            "message": (
                "Я умею строить несколько видов графиков по данным вашего кабинета:\n\n"
                "📊 **Доступно прямо сейчас:**\n"
                "• **Прогноз остатка** — линейный график, на сколько дней хватит текущих средств\n"
                "• **Структура расходов** — круговая диаграмма по категориям за месяц\n"
                "• **Сравнение месяцев** — столбчатая диаграмма (февраль vs март и т.п.)\n"
                "• **Остатки по счетам** — гистограмма по всем счетам в BYN\n\n"
                "Скажите, что нарисовать, например:\n"
                "• «Прогноз остатка»\n"
                "• «Расходы за 2026-03»\n"
                "• «Сравни февраль и март»\n"
                "• «Сколько на счёте»"
            ),
            "charts": [to_chart_line("Прогноз остатка", forecast["forecast"])],
            "sources": [
                {"index": 1, "label": "Источник 1: Счета и выписка", "kind": "account", "url": "/statement"},
                {"index": 2, "label": "Источник 2: Аналитика", "kind": "analytics", "url": "/services"},
            ],
            "action_buttons": [
                {"label": "📈 Прогноз остатка", "message": "Кассовый прогноз", "variant": "primary"},
                {"label": "🥧 Расходы за март", "message": "Расходы за 2026-03", "variant": "secondary"},
                {"label": "📊 Сравнить месяцы", "message": "Сравни февраль и март", "variant": "secondary"},
            ],
            "suggested_chips": [
                "Кассовый прогноз",
                "Расходы за 2026-03",
                "Сравни февраль и март",
                "Сколько на счёте?",
            ],
        }

    if re.search(r"расход|покажи\s+расход|структур\w*\s+расход", low):
        month_m = re.search(r"(20\d{2}-\d{2})", message)
        month = month_m.group(1) if month_m else None
        items = await monthly_expenses(session, org_id, month)
        if not items:
            return {
                "message": "За выбранный период расходов нет. Укажите месяц, например: «расходы за 2026-03».",
                "pending_form_fields": ["Период (YYYY-MM)"],
                "action_buttons": [
                    {"label": "За март 2026", "message": "Расходы за 2026-03", "variant": "primary"},
                    {"label": "За июнь 2026", "message": "Расходы за 2026-06", "variant": "secondary"},
                ],
            }
        lines = "\n".join(f"• {i['category']} — {i['amount']:,.2f} BYN" for i in items[:8])
        month_label = month or "последние месяцы"
        return {
            "message": f"Расходы по категориям за **{month_label}**:\n{lines}",
            "charts": [to_chart_pie("Структура расходов", items)],
            "sources": [{"index": 1, "label": "Аналитика расходов", "kind": "analytics", "url": "/services"}],
            "action_buttons": [
                {"label": "Сравнить с другим месяцем", "message": "Сравни февраль и март", "variant": "primary"},
                {"label": "Прогноз остатка", "message": "Кассовый прогноз", "variant": "secondary"},
                {"label": "Выписка", "url": "/statement", "variant": "secondary"},
            ],
            "suggested_chips": [
                "Сравни февраль и март",
                "Кассовый прогноз",
                "Покажи источник №1",
            ],
        }
        month_m = re.search(r"(20\d{2}-\d{2})", message)
        month = month_m.group(1) if month_m else None
        items = await monthly_expenses(session, org_id, month)
        if not items:
            return {
                "message": "За выбранный период расходов нет. Укажите месяц, например: «расходы за 2026-03».",
                "pending_form_fields": ["Период (YYYY-MM)"],
                "action_buttons": [
                    {"label": "За март 2026", "message": "Расходы за 2026-03", "variant": "primary"},
                    {"label": "За июнь 2026", "message": "Расходы за 2026-06", "variant": "secondary"},
                ],
            }
        lines = "\n".join(f"• {i['category']} — {i['amount']:,.2f} BYN" for i in items[:8])
        return {
            "message": f"Расходы по категориям:\n{lines}",
            "charts": [to_chart_pie("Структура расходов", items)],
            "sources": [{"index": 1, "label": "Аналитика расходов", "kind": "analytics", "url": "/services"}],
            "action_buttons": [{"label": "Выписка", "url": "/statement", "variant": "secondary"}],
        }

    if re.search(r"сравни|сравнение", low) and re.search(r"феврал|март|апрел|май|июн", low):
        month_a, month_b = "2026-02", "2026-03"
        if "март" in low and "апрел" in low:
            month_a, month_b = "2026-03", "2026-04"
        elif "май" in low and "июн" in low:
            month_a, month_b = "2026-05", "2026-06"
        data = await compare_months(session, org_id, month_a, month_b)
        return {
            "message": (
                f"Сравнение расходов:\n"
                f"• {month_a}: **{data['amount_a']:,.2f} BYN**\n"
                f"• {month_b}: **{data['amount_b']:,.2f} BYN**"
            ),
            "charts": [to_chart_bar(f"{month_a} vs {month_b}", [month_a, month_b], [data["amount_a"], data["amount_b"]])],
            "sources": [{"index": 1, "label": "Аналитика расходов", "kind": "analytics", "url": "/services"}],
        }

    # ── AI-прогноз остатков на N дней ─────────────────────────────────────
    # Ловим: «кассовый разрыв», «прогноз остатков», «хватит ли денег на N дней»,
    # «прогноз на следующую неделю / 2 недели / месяц». Горизонт по умолчанию 7.
    if re.search(
        r"кассов\w*\s+(?:разрыв|прогноз|дефицит)|"
        r"прогноз\s+(?:остат|денег|баланс)|"
        r"хватит\s+ли\s+денег|"
        r"на\s+сколько\s+(?:хватит|хватит\s+денег)|"
        r"денежн\w*\s+поток\s+на\s+ближайш",
        low,
    ):
        logger.info("[forecast] intent matched for: %r", message)
        horizon = 7
        # пытаемся вытащить горизонт из текста
        num_m = re.search(r"\b(\d{1,2})\s*(?:дн|дней|день)\b", low)
        if num_m:
            horizon = max(1, min(int(num_m.group(1)), 30))
        elif re.search(r"\bдве\s+недел\w*|2\s*недел\w*\b", low):
            horizon = 14
        elif re.search(r"\bтри\s+недел\w*|3\s*недел\w*\b", low):
            horizon = 21
        elif re.search(r"\bнедел\w*\b|следующ\w*\s+недел", low):
            horizon = 7
        elif re.search(r"\bмесяц\w*\b|30\s*дн", low):
            horizon = 30

        forecast = await build_cash_forecast(session, org_id, horizon_days=horizon)
        logger.info("[forecast] built forecast via %s, horizon=%d", forecast.get("provider_source"), horizon)
        return forecast_to_assistant_response(forecast)

    # Старый rule-based «кассовый разрыв» с длинным горизонтом — оставлен как
    # fallback для случаев, когда LLM недоступен, но нужен общий сигнал «когда
    # кончатся деньги». Используется из ветки анализа рисков ниже.
    if re.search(r"когда\s+конч\w*тся\s+денег|законч\w*тся\s+средств", low):
        data = await cash_gap_forecast(session, org_id)
        return {
            "message": (
                f"Остаток BYN сейчас: **{data['current_balance']:,.2f}**.\n"
                f"Средний отток: {data['avg_monthly_outflow']:,.2f} BYN/мес.\n"
                f"Ориентировочно до дефицита: ~{data['days_to_gap']} дн."
            ),
            "charts": [to_chart_line("Прогноз остатка", data["forecast"])],
            "sources": [{"index": 1, "label": "Счета и выписка", "kind": "account", "url": "/statement"}],
        }

    if is_balance_query(message):
        data = await get_balance_data(session, org_id)
        byn = data["total_byn"]
        eur = data["total_eur"]
        usd = data["total_usd"]
        rub = data["total_rub"]

        # Текстовое summary — реальные суммы из БД
        currency_parts: list[str] = []
        if byn:
            currency_parts.append(f"**{byn:,.2f} BYN**")
        if usd:
            currency_parts.append(f"{usd:,.2f} USD")
        if eur:
            currency_parts.append(f"{eur:,.2f} EUR")
        if rub:
            currency_parts.append(f"{rub:,.2f} RUB")
        if not currency_parts:
            currency_parts.append("нет активных счетов")

        history = data["history"]
        history_text = ""
        if history:
            lines = [
                f"  • {h['label']}: {h['amount']:+,.2f} BYN (дебет {h['debit']:,.2f} / кредит {h['credit']:,.2f})"
                for h in history
            ]
            history_text = "\nДинамика по выписке (net-поток):\n" + "\n".join(lines)

        accs = data["accounts"]
        text = (
            f"💰 **Остатки на счетах:**\n"
            f"  • BYN: **{byn:,.2f}**\n"
            f"  • USD: {usd:,.2f}\n"
            f"  • EUR: {eur:,.2f}\n"
            f"  • RUB: {rub:,.2f}\n"
            f"Всего счетов: **{len(accs)}**.{history_text}"
        )

        # Bar chart: текущие остатки по счетам в BYN (берём только BYN, чтобы не
        # смешивать валюты на одной шкале). Не-BYN счета добавляем подписями.
        byn_accounts = [a for a in accs if a["currency"] == "BYN"]
        bar_labels = [
            (a["label"] or a["iban"][-4:]).strip() or a["iban"][-4:]
            for a in byn_accounts
        ] or ["Нет счёта в BYN"]
        bar_values = [a["balance"] for a in byn_accounts] or [0.0]
        bar_chart = to_chart_bar("Остатки по счетам (BYN)", bar_labels, bar_values, "BYN")

        # Line chart: net-поток по месяцам из выписки.
        # Собираем dict вручную, чтобы labels были названиями месяцев
        # (to_chart_line жёстко проставляет «День N», что не подходит для истории).
        line_labels = [h["label"] for h in history] or ["Нет данных"]
        line_values = [h["amount"] for h in history] or [0.0]
        line_chart = {
            "type": "line",
            "title": "Поток по выписке, BYN/мес",
            "labels": line_labels,
            "datasets": [{"label": "BYN", "data": line_values}],
            "currency": "BYN",
        }

        chart_payload = {
            "type": "balance",
            "data": data,  # полный dict с totals/accounts/history
            "bar": {
                "title": bar_chart["title"],
                "labels": bar_chart["labels"],
                "values": bar_chart["datasets"][0]["data"],
                "currency": "BYN",
            },
            "line": {
                "title": line_chart["title"],
                "labels": line_chart["labels"],
                "values": line_chart["datasets"][0]["data"],
                "currency": "BYN",
            },
        }

        return {
            "message": text,
            "chart_payload": chart_payload,
            "charts": [bar_chart, line_chart],
            "sources": [
                {
                    "index": 1,
                    "label": "Источник 1: Счета и выписка",
                    "kind": "account",
                    "url": "/statement/account",
                }
            ],
            "action_buttons": [
                {"label": "Открыть выписку", "url": "/statement", "variant": "primary"},
                {"label": "За квартал", "message": "Покажи выписку за отчётный квартал", "variant": "secondary"},
                {"label": "За год", "message": "Покажи выписку за год", "variant": "secondary"},
            ],
        }

    if is_open_counterparty_query(message):
        open_m = re.search(
            r"(?:откро\w*|покажи|показать|открыть)\s+(?:карточк\w*\s+)?(?:контрагент\w*|клиент\w*|поставщик\w*)?\s*(.+)$",
            message,
            re.I,
        )
        query = normalize_counterparty_query(open_m.group(1) if open_m else message)
        cp = await lookup_counterparty(session, org_id, query) if query else None
        if cp:
            url = f"/services/counterparty?cp={cp.id}"
            return {
                "message": (
                    f"Открываю карточку контрагента **{cp.name}**.\n"
                    f"УНП: {cp.unp or '—'} · Счёт: {cp.account or '—'} · Банк: {cp.bank_name or '—'}"
                ),
                "sources": [
                    {"index": 1, "label": f"Источник 1: {cp.name}", "kind": "counterparty", "id": cp.id, "url": url}
                ],
                "ui_actions": [{"type": "navigate", "target": url}],
                "action_buttons": [
                    {"label": "Открыть карточку", "url": url, "variant": "primary"},
                    {"label": "Проверить риск", "message": f"Проверь контрагента {cp.name}", "variant": "secondary"},
                    {"label": "Создать платёж", "message": f"Создай платёжку для {cp.name}", "variant": "secondary"},
                ],
            }
        # fall through to generic search if no exact counterparty matched

    if is_payments_by_name_query(message):
        from services.banking.search import _parse_currency

        m = _PAYMENTS_BY_NAME_RE.match(message.strip())
        rest = m.group(1).strip() if m else message
        wanted_currency = _parse_currency(message)
        hits = await smart_search(session, f"платежи {rest}", org_id=org_id)
        hits = [h for h in hits if h.kind == "payment"] or hits
        # Если пользователь явно указал валюту — не путаем его, фильтруем строго
        # и подсвечиваем, если нашли в другой валюте.
        currency_note = ""
        if wanted_currency:
            in_wanted = [h for h in hits if h.currency == wanted_currency]
            if in_wanted:
                hits = in_wanted
            elif hits:
                cur = hits[0].currency or "?"
                currency_note = (
                    f"\n\n⚠️ Нет платежей в {wanted_currency}; "
                    f"показываю ближайший в {cur}."
                )
        text, sources = format_search_response(f"платежи {rest}", hits)
        if currency_note:
            text = text + currency_note
        return _build_search_payload(message, hits, sources, text)

    if is_report_query(message) or (
        is_search_query(message) and re.search(r"отчёт|отчет|report", low)
    ):
        hits = await search_reports(session, message, org_id=org_id)
        if not hits and is_search_query(message):
            hits = await smart_search(session, message, org_id=org_id)
        text, sources = format_search_response(message, hits)
        return _build_search_payload(message, hits, sources, text)

    if is_search_query(message):
        hits = await smart_search(session, message, org_id=org_id)
        text, sources = format_search_response(message, hits)
        return _build_search_payload(message, hits, sources, text)

    if re.search(r"выписк", low) and re.search(r"сч[её]т|период|за\s+", low):
        missing = []
        if not re.search(r"сч[её]т|byn|usd|iban|by\d", low):
            missing.append("Счёт")
        if not re.search(r"сегодня|вчера|месяц|недел|квартал|год|20\d{2}", low):
            missing.append("Период")
        if missing:
            return {
                "message": f"Для выписки укажите: {', '.join(missing)}.",
                "pending_form_fields": missing,
                "action_buttons": [
                    {"label": "За месяц", "message": "Выписка за месяц", "variant": "primary"},
                    {"label": "За квартал", "message": "Выписка за квартал", "variant": "secondary"},
                    {"label": "За год", "message": "Выписка за год", "variant": "secondary"},
                    {"label": "За сегодня", "message": "Выписка за сегодня", "variant": "secondary"},
                ],
            }

    if re.search(r"повтор\w*\s+последн|последн\w*\s+(?:платёж|платеж|документ)", low):
        result = await session.execute(
            select(BankDocument)
            .where(BankDocument.org_id == org_id)
            .order_by(BankDocument.doc_date.desc())
            .limit(1)
        )
        doc = result.scalars().first()
        if doc:
            return {
                "message": (
                    f"Последний документ: {doc.doc_number} от {doc.doc_date}, "
                    f"{doc.counterparty}, {doc.amount} {doc.currency} ({doc.status})."
                ),
                "sources": [
                    {
                        "index": 1,
                        "label": f"Источник 1: {doc.doc_number}",
                        "kind": "document",
                        "id": doc.id,
                        "url": document_view_url(doc.id),
                    }
                ],
                "action_buttons": [
                    {"label": "Повторить платёж", "message": f"Создай платёжку на {doc.amount} BYN для {doc.counterparty}", "variant": "primary"},
                    {"label": "Расчёты", "url": "/payments", "variant": "secondary"},
                ],
            }
    return None
