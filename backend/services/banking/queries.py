"""Запросы к банковским данным для ассистента."""
from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankAccount, BankDocument, Counterparty, OrganizationProfile
from services.banking.analytics import (
    cash_gap_forecast,
    compare_months,
    monthly_expenses,
    to_chart_bar,
    to_chart_line,
    to_chart_pie,
)
from services.banking.notifications import handle_notification_query, is_notification_query
from services.banking.search import format_search_response, smart_search


async def lookup_counterparty(
    session: AsyncSession, org_id: str, name: str
) -> Counterparty | None:
    """Найти контрагента организации в PostgreSQL по имени."""
    query = (name or "").strip()
    if len(query) < 2:
        return None
    result = await session.execute(
        select(Counterparty)
        .where(Counterparty.org_id == org_id, Counterparty.name.ilike(f"%{query}%"))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_org_profile(session: AsyncSession, org_id: str = "demo") -> OrganizationProfile:
    result = await session.execute(
        select(OrganizationProfile).where(OrganizationProfile.id == org_id)
    )
    row = result.scalar_one_or_none()
    if row:
        return row
    return OrganizationProfile(id="demo", org_name="DEMO ЮРИДИЧЕСКОЕ ЛИЦО", user_role="businessman")


async def get_balance_summary(session: AsyncSession, org_id: str = "demo") -> str:
    result = await session.execute(
        select(BankAccount).where(BankAccount.org_id == org_id, BankAccount.hidden == False)
    )
    accounts = result.scalars().all()
    byn = sum(a.balance for a in accounts if a.currency == "BYN")
    parts = [f"**{byn:,.2f} BYN** на расчётных счетах"]
    for cur in ("EUR", "USD", "RUB"):
        total = sum(a.balance for a in accounts if a.currency == cur)
        if total:
            parts.append(f"{total:,.2f} {cur}")
    return "Остаток по счетам: " + "; ".join(parts) + "."


def is_balance_query(message: str) -> bool:
    low = message.lower()
    return bool(
        re.search(
            r"сколько\s+(?:денег|средств)|остаток|баланс|на\s+счет",
            low,
        )
    )


def is_search_query(message: str) -> bool:
    low = message.lower()
    return bool(
        re.search(
            r"найди|найти|покажи|поиск|где\s+(?:платёж|платеж|документ|счёт|счет)|"
            r"карточк\w*\s+(?:клиент|контрагент)",
            low,
        )
    )


async def handle_banking_query(
    session: AsyncSession, message: str, org_id: str = "demo", session_id: str | None = None
) -> dict | None:
    from services.chat.session_sources import get_source
    from services.banking.counterparty_risk import format_risk_report, get_counterparty_risk
    from services.tax.calendar import demo_fszh_amount, format_tax_calendar_reply, get_tax_calendar
    import uuid as _uuid

    low = message.lower()

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
            if kind == "document" and doc_id:
                doc = await session.get(BankDocument, doc_id)
                if doc:
                    url = f"/payments/paydocbyn?hl={','.join(highlight)}&source_doc={doc.id}"
                    return {
                        "message": (
                            f"**Источник {idx}:** {doc.doc_number} от {doc.doc_date}\n"
                            f"Контрагент: {doc.counterparty}\n"
                            f"Сумма: **{doc.amount:,.2f}** {doc.currency}\n"
                            f"Назначение: {doc.purpose}\n"
                            f"Статус: {doc.status}\n\n"
                            f"Открываю документ с подсветкой полей."
                        ),
                        "sources": [
                            {
                                "index": idx,
                                "label": f"Источник {idx}: {doc.doc_number}",
                                "kind": "document",
                                "id": doc.id,
                                "url": url,
                                "highlight_fields": highlight,
                            }
                        ],
                        "ui_actions": [{"type": "navigate", "target": url}],
                        "action_buttons": [
                            {"label": "Открыть документ", "url": url, "variant": "primary"},
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
        query = name_m.group(1).strip() if name_m else message
        for token in ["проверь", "контрагента", "благонадёжность", "риск"]:
            query = re.sub(token, "", query, flags=re.I).strip()
        risk = await get_counterparty_risk(session, org_id, query or "Ромашка")
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
        return {
            "message": "Укажите название контрагента, например: «Проверь контрагента ООО Ромашка».",
            "pending_form_fields": ["Название контрагента"],
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

    if re.search(r"расход|покажи\s+расход|структур\w*\s+расход", low):
        month_m = re.search(r"(20\d{2}-\d{2})", message)
        month = month_m.group(1) if month_m else None
        items = await monthly_expenses(session, org_id, month)
        if not items:
            return {
                "message": "За выбранный период расходов в базе нет. Укажите месяц, например: «расходы за 2026-03».",
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
            "sources": [{"index": 1, "label": "Аналитика PostgreSQL", "kind": "analytics", "url": "/services"}],
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
            "sources": [{"index": 1, "label": "Аналитика PostgreSQL", "kind": "analytics", "url": "/services"}],
        }

    if re.search(r"кассов\w*\s+разрыв|прогноз\s+остат", low):
        data = await cash_gap_forecast(session, org_id)
        expl = (
            f"На основе среднего оттока {data['avg_monthly_outflow']:,.0f} BYN/мес "
            f"и текущего остатка {data['current_balance']:,.0f} BYN "
            f"дефицит возможен примерно через {data['days_to_gap']} дн."
        )
        return {
            "message": (
                f"Текущий остаток BYN: **{data['current_balance']:,.2f}**\n"
                f"Средний месячный отток: {data['avg_monthly_outflow']:,.2f} BYN\n"
                f"Ориентировочно до дефицита: ~{data['days_to_gap']} дн.\n\n"
                f"_{expl}_"
            ),
            "charts": [to_chart_line("Прогноз остатка", data["forecast"])],
            "sources": [{"index": 1, "label": "Счета PostgreSQL", "kind": "account", "url": "/statement"}],
        }

    if is_balance_query(message):
        text = await get_balance_summary(session, org_id)
        return {
            "message": text,
            "sources": [{"index": 1, "label": "Источник 1: Выписка по счёту", "kind": "account", "url": "/"}],
            "action_buttons": [
                {"label": "Детализация счетов", "url": "/", "variant": "primary"},
                {"label": "Выписка", "url": "/statement", "variant": "secondary"},
                {"label": "Последние операции", "message": "Покажи последние документы", "variant": "secondary"},
            ],
        }

    if is_search_query(message):
        hits = await smart_search(session, message, org_id=org_id)
        text, sources = format_search_response(message, hits)
        buttons = []
        if hits:
            h = hits[0]
            if h.url:
                buttons.append({"label": "Открыть", "url": h.url, "variant": "primary"})
            if h.kind == "payment":
                buttons.append({"label": "Связанные платежи", "message": f"Платежи {h.title.split('—')[0]}", "variant": "secondary"})
        return {"message": text, "sources": sources, "action_buttons": buttons}

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
                "sources": [{"index": 1, "label": f"Источник 1: {doc.doc_number}", "kind": "document", "url": "/payments"}],
                "action_buttons": [
                    {"label": "Повторить платёж", "message": f"Создай платёжку на {doc.amount} BYN для {doc.counterparty}", "variant": "primary"},
                    {"label": "Расчёты", "url": "/payments", "variant": "secondary"},
                ],
            }
    return None
