"""AI-кассовый прогноз на N дней: OpenAI со строгим JSON в промпте.

Пайплайн:
  1) Собираем реальные данные по org_id: текущий остаток, история выписки,
     запланированные платежи (BankDocument со статусом «На подписи» /
     «Черновик» / «В обработке»).
  2) Отправляем это в OpenAI/OpenRouter с response_format=json_object и
     ЖЁСТКОЙ схемой ответа, описанной прямо в system prompt.
  3) Валидируем структуру ответа (forecast длиной N дней, типы, разумные суммы).
  4) Если OpenAI недоступен / ответ не парсится / не проходит валидацию —
     считаем простую экстраполяцию локально (avg-out/день) с пометкой
     provider="rule-based", чтобы фронт мог показать чип «по правилам».

На выходе — dict, который сразу подкладывается в AssistantResponse
(поля message, charts, chart_payload, suggested_chips, action_buttons).
"""
from __future__ import annotations

import json
import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from db.models import BankAccount, BankDocument, StatementLine
from services.banking.analytics import to_chart_line

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# 1) Сбор реальных данных по организации
# ─────────────────────────────────────────────────────────────────────────────

# Статусы документов, которые означают «деньги ещё не ушли, но уйдут».
_UPCOMING_STATUSES = ("На подписи", "Черновик", "В обработке", "К подписанию")

# Сколько месяцев истории отдаём в LLM.
_HISTORY_MONTHS = 3
# Сколько ближайших платежей показываем в контексте.
_MAX_SCHEDULED = 8


def _ru_short_weekday(d: datetime) -> str:
    return ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][d.weekday()]


def _ru_month_short(m: int) -> str:
    return [
        "", "янв", "фев", "мар", "апр", "май", "июн",
        "июл", "авг", "сен", "окт", "ноя", "дек",
    ][m]


def _parse_doc_date(s: str) -> datetime | None:
    """dd.mm.yyyy → datetime (или None)."""
    if not s:
        return None
    s = str(s).strip()
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


async def _collect_forecast_context(
    session: AsyncSession, org_id: str, horizon_days: int
) -> dict[str, Any]:
    """Собираем ВСЁ, что нужно для прогноза. Никаких хардкод-чисел — только БД.

    Возвращает dict, который пойдёт прямо в JSON-сообщение к LLM:
      {
        "as_of": "2026-06-11",          # дата прогноза (today)
        "horizon_days": 7,
        "current_balance_byn": float,
        "current_balance_by_currency": {"BYN": float, "USD": float, ...},
        "accounts": [ {iban, label, currency, balance}, ... ],
        "history_monthly": [ {month, debit, credit, net}, ... ],   # _HISTORY_MONTHS назад
        "scheduled_payments": [           # ближайшие _MAX_SCHEDULED
           {date, amount, currency, counterparty, purpose, status}
        ],
      }
    """
    today = datetime.utcnow().date()
    today_str = today.isoformat()

    # Счета и текущий остаток
    acc_q = await session.execute(
        select(BankAccount).where(
            BankAccount.org_id == org_id, BankAccount.hidden.is_(False)
        )
    )
    accounts = list(acc_q.scalars().all())
    by_currency: dict[str, float] = defaultdict(float)
    accounts_out: list[dict] = []
    for a in accounts:
        bal = float(a.balance or 0.0)
        by_currency[a.currency] += bal
        accounts_out.append(
            {
                "iban_tail": (a.iban or "")[-4:],
                "label": a.label or "",
                "currency": a.currency,
                "balance": round(bal, 2),
            }
        )

    # История выписки: net-поток по месяцам за _HISTORY_MONTHS месяцев
    monthly: dict[str, dict[str, float]] = defaultdict(
        lambda: {"debit": 0.0, "credit": 0.0, "count": 0}
    )
    stmt_q = await session.execute(
        select(StatementLine).where(StatementLine.org_id == org_id)
    )
    for line in stmt_q.scalars().all():
        dt = _parse_doc_date(line.operation_date)
        if not dt:
            continue
        # оставляем только месяцы в пределах последних _HISTORY_MONTHS
        months_ago = (today.year - dt.year) * 12 + (today.month - dt.month)
        if months_ago < 0 or months_ago >= _HISTORY_MONTHS:
            continue
        key = f"{dt.year:04d}-{dt.month:02d}"
        monthly[key]["debit"] += float(line.debit or 0.0)
        monthly[key]["credit"] += float(line.credit or 0.0)
        monthly[key]["count"] += 1

    history_out: list[dict] = []
    for key in sorted(monthly.keys()):
        year, month = key.split("-")
        d = monthly[key]["debit"]
        c = monthly[key]["credit"]
        history_out.append(
            {
                "month": key,
                "label": f"{_ru_month_short(int(month))} {year}",
                "debit": round(d, 2),
                "credit": round(c, 2),
                "net": round(c - d, 2),
            }
        )

    # Запланированные платежи: документы со статусом «На подписи/Черновик/...»
    sched_q = await session.execute(
        select(BankDocument)
        .where(
            BankDocument.org_id == org_id,
            BankDocument.status.in_(_UPCOMING_STATUSES),
        )
        .order_by(BankDocument.doc_date.asc())
        .limit(_MAX_SCHEDULED * 3)  # возьмём с запасом, отфильтруем по дате ниже
    )
    upcoming = list(sched_q.scalars().all())

    cutoff = today + timedelta(days=horizon_days + 1)
    scheduled: list[dict] = []
    for d in upcoming:
        dt = _parse_doc_date(d.doc_date)
        if not dt or dt.date() > cutoff:
            continue
        scheduled.append(
            {
                "date": dt.strftime("%Y-%m-%d"),
                "amount": round(float(d.amount or 0.0), 2),
                "currency": d.currency or "BYN",
                "counterparty": d.counterparty or "",
                "purpose": (d.purpose or "")[:120],
                "status": d.status or "",
            }
        )
        if len(scheduled) >= _MAX_SCHEDULED:
            break

    return {
        "as_of": today_str,
        "horizon_days": horizon_days,
        "current_balance_byn": round(by_currency.get("BYN", 0.0), 2),
        "current_balance_by_currency": {
            k: round(v, 2) for k, v in by_currency.items() if v
        },
        "accounts": accounts_out,
        "history_monthly": history_out,
        "scheduled_payments": scheduled,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2) Rule-based fallback (если OpenAI недоступен)
# ─────────────────────────────────────────────────────────────────────────────

def _rule_based_forecast(ctx: dict[str, Any], horizon_days: int) -> dict[str, Any]:
    """Простая экстраполяция: среднедневной отток из истории, без учёта
    scheduled_payments. Используется только как fallback."""
    history = ctx.get("history_monthly") or []
    byn_balance = float(ctx.get("current_balance_byn") or 0.0)

    if history:
        total_out = sum(max(0.0, h["debit"]) for h in history)
        # сколько всего дней покрывает история
        days = max(_HISTORY_MONTHS * 30, 1)
        daily_out = total_out / days
    else:
        daily_out = byn_balance / 60 if byn_balance else 0.0  # «уйдёт за 60 дней»

    today = datetime.strptime(ctx["as_of"], "%Y-%m-%d").date()
    forecast: list[dict] = []
    bal = byn_balance
    minimum = byn_balance
    min_day = 0
    for i in range(1, horizon_days + 1):
        bal = max(0.0, bal - daily_out)
        d = today + timedelta(days=i)
        forecast.append(
            {
                "day": i,
                "date": d.isoformat(),
                "weekday": _ru_short_weekday(d),
                "balance": round(bal, 2),
                "note": "",
            }
        )
        if bal < minimum:
            minimum = bal
            min_day = i

    gap_detected = minimum < 0
    if gap_detected:
        rec = (
            f"Кассовый разрыв возможен на день {min_day} — "
            f"прогнозный минимум {minimum:,.2f} BYN. "
            f"Среднедневной отток {daily_out:,.0f} BYN/день."
        )
    else:
        delta = forecast[-1]["balance"] - byn_balance
        sign = "+" if delta >= 0 else "−"
        rec = (
            f"Разрыва нет. Прогноз: {sign}{abs(delta):,.2f} BYN за {horizon_days} дн. "
            f"Минимум {minimum:,.2f} BYN на день {min_day}."
        )

    return {
        "forecast": forecast,
        "current_balance": byn_balance,
        "minimum": round(minimum, 2),
        "minimum_day": min_day,
        "gap_detected": gap_detected,
        "recommendation": rec,
        "provider": "rule-based",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3) OpenAI: жёсткий JSON, валидация, fallback
# ─────────────────────────────────────────────────────────────────────────────

_FORECAST_SYSTEM_PROMPT = """\
Ты финансовый аналитик. Тебе дают реальные данные по организации: текущий
остаток по счетам, история выписки за 3 месяца (debit/credit/net) и
запланированные платежи на горизонте.

Твоя задача: построить прогноз ежедневного остатка на заданное число дней.

ОТВЕЧАЙ СТРОГО ВАЛИДНЫМ JSON, без пояснений до/после. Используй ровно эту
схему и НИЧЕГО ЛИШНЕГО:

{
  "current_balance": <float>,                 // подтверди текущий остаток в BYN
  "minimum": <float>,                          // минимальный прогнозный остаток за горизонт
  "minimum_day": <int 1..horizon>,             // на какой день минимум
  "gap_detected": <bool>,                      // true если minimum < 0
  "forecast": [
    {
      "day": <int 1..horizon>,
      "date": "<YYYY-MM-DD>",
      "weekday": "<Пн|Вт|Ср|Чт|Пт|Сб|Вс>",
      "balance": <float>,                       // прогноз остатка на КОНЕЦ этого дня
      "note": "<короткое событие, иначе пусто>"
    },
    ...ровно horizon объектов...
  ],
  "recommendation": "<1-2 коротких предложения на русском, без звёздочек и markdown>"
}

Правила прогноза:
- Базовая линия: среднедневной отток из history_monthly (если есть).
- Корректируй день на размер и дату scheduled_payments: в день платежа
  остаток уменьшается на amount (или растёт, если это возврат/поступление —
  ориентируйся на знак purpose: «поступление», «возврат» → плюс).
- Если данных мало — будь консервативен, не предсказывай обвал ниже 0 без оснований.
- Не выдумывай контрагентов и суммы, которых нет в scheduled_payments.
- Числа округляй до 2 знаков. balance не может быть < 0, обрезай в 0.
- recommendation: дружелюбно, на «вы», 1-2 предложения, по делу.
"""


def _validate_forecast(payload: Any, horizon_days: int) -> dict[str, Any] | None:
    """Парсим JSON от LLM и проверяем минимальную корректность."""
    if not isinstance(payload, dict):
        return None
    forecast = payload.get("forecast")
    if not isinstance(forecast, list) or len(forecast) != horizon_days:
        return None

    cleaned: list[dict] = []
    for item in forecast:
        if not isinstance(item, dict):
            return None
        try:
            day = int(item.get("day"))
            balance = float(item.get("balance"))
        except (TypeError, ValueError):
            return None
        if day < 1 or day > horizon_days:
            return None
        cleaned.append(
            {
                "day": day,
                "date": str(item.get("date") or ""),
                "weekday": str(item.get("weekday") or "")[:3],
                "balance": round(max(0.0, balance), 2),
                "note": str(item.get("note") or "").strip()[:80],
            }
        )

    try:
        cur = float(payload.get("current_balance"))
        minimum = float(payload.get("minimum"))
        min_day = int(payload.get("minimum_day"))
    except (TypeError, ValueError):
        return None
    min_day = max(1, min(min_day, horizon_days))

    rec = str(payload.get("recommendation") or "").strip()
    # подчистим recommendation: без markdown-звёздочек и code-fence
    rec = re.sub(r"\*+", "", rec)
    rec = re.sub(r"`+", "", rec)
    rec = re.sub(r"\n{2,}", " ", rec).strip()
    if not rec:
        rec = "Прогноз построен."

    gap = bool(payload.get("gap_detected")) or minimum < 0

    return {
        "forecast": cleaned,
        "current_balance": round(cur, 2),
        "minimum": round(max(0.0, minimum), 2),
        "minimum_day": min_day,
        "gap_detected": gap,
        "recommendation": rec[:240],
    }


def _llm_client():
    from openai import AsyncOpenAI

    kwargs: dict = {"api_key": settings.OPENAI_API_KEY}
    if settings.OPENAI_BASE_URL:
        kwargs["base_url"] = settings.OPENAI_BASE_URL
    headers: dict[str, str] = {}
    if settings.OPENROUTER_SITE_URL:
        headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
    if settings.OPENROUTER_APP_NAME:
        headers["X-Title"] = settings.OPENROUTER_APP_NAME
    if headers:
        kwargs["default_headers"] = headers
    return AsyncOpenAI(**kwargs)


async def _llm_forecast(ctx: dict[str, Any], horizon_days: int) -> dict[str, Any] | None:
    if not settings.OPENAI_API_KEY:
        return None
    try:
        client = _llm_client()
        user_msg = (
            f"Горизонт прогноза: {horizon_days} дней.\n"
            f"Дата прогноза (as_of): {ctx['as_of']}.\n"
            f"Данные организации (JSON):\n{json.dumps(ctx, ensure_ascii=False)}"
        )
        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": _FORECAST_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        raw = (resp.choices[0].message.content or "").strip()
        # OpenAI иногда оборачивает json_object в ```json ... ``` — снимем fence
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        payload = json.loads(raw)
        validated = _validate_forecast(payload, horizon_days)
        if validated is None:
            logger.warning("forecast: LLM returned non-conforming JSON: %s", raw[:300])
            return None
        validated["provider"] = "openai"
        return validated
    except Exception as exc:  # noqa: BLE001
        logger.warning("forecast: OpenAI failed (%s); falling back to rule-based", exc)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# 4) Публичная функция: горизонт по умолчанию 7 дней
# ─────────────────────────────────────────────────────────────────────────────

async def build_cash_forecast(
    session: AsyncSession, org_id: str, horizon_days: int = 7
) -> dict[str, Any]:
    """Собираем контекст → OpenAI (с fallback) → собираем dict для AssistantResponse."""
    horizon = max(1, min(int(horizon_days), 30))
    ctx = await _collect_forecast_context(session, org_id, horizon)

    # 1) пробуем LLM
    result = await _llm_forecast(ctx, horizon)
    if result is None:
        result = _rule_based_forecast(ctx, horizon)
    result["provider_source"] = result.pop("provider", "rule-based")
    result["horizon_days"] = horizon
    result["as_of"] = ctx["as_of"]

    # 2) гарантируем 7 точек на графике (если horizon меньше — добиваем нулями,
    #    что маловероятно — horizon у нас ≥ 1).
    labels = [f"{p['weekday']}" for p in result["forecast"]]
    values = [p["balance"] for p in result["forecast"]]
    chart = to_chart_line(
        f"Прогноз остатков ({horizon} дн.)", [
            {"day": i + 1, "balance": v} for i, v in enumerate(values)
        ],
    )
    # перепишем labels на короткие weekday-ы (to_chart_line ставит «День N»)
    chart["labels"] = labels
    chart["datasets"][0]["label"] = "Остаток BYN"

    result["chart"] = chart
    return result


def forecast_to_assistant_response(
    forecast: dict[str, Any],
) -> dict[str, Any]:
    """Чистый dict → подкладываем в return-ветку в queries.py.

    Возвращает dict c полями: message, charts, chart_payload, sources,
    severity, suggested_chips, action_buttons, response_tone.
    """
    fc = forecast.get("forecast") or []
    today = datetime.strptime(forecast["as_of"], "%Y-%m-%d").date()
    # Полные подписи для оси X (дд.мм + weekday)
    x_labels = [
        f"{p['date'][8:10]}.{p['date'][5:7]}\n{p['weekday']}" for p in fc
    ]

    # Сообщение — строго как на скрине: «Проанализировал движение денег...»
    msg_lines = [
        "Проанализировал движение денег по всем счетам с учетом запланированных платежей.",
    ]
    if forecast.get("provider_source") == "rule-based":
        msg_lines.append(
            "_Прогноз построен по среднедневному оттоку из истории — OpenAI недоступен._"
        )

    chart_payload = {
        "type": "forecast",
        "horizon_days": forecast.get("horizon_days", 7),
        "as_of": forecast.get("as_of"),
        "current_balance": forecast.get("current_balance"),
        "minimum": forecast.get("minimum"),
        "minimum_day": forecast.get("minimum_day"),
        "gap_detected": bool(forecast.get("gap_detected")),
        "recommendation": forecast.get("recommendation") or "",
        "x_labels": x_labels,
        "values": [p["balance"] for p in fc],
        "notes": [p.get("note") or "" for p in fc],
        "provider": forecast.get("provider_source", "rule-based"),
    }

    return {
        "message": "\n\n".join(msg_lines),
        "chart_payload": chart_payload,
        "charts": [forecast["chart"]],
        "sources": [
            {
                "index": 1,
                "label": "Источник 1: Счета, выписка и запланированные платежи",
                "kind": "analytics",
                "url": "/statement",
            }
        ],
        "severity": "critical" if forecast.get("gap_detected") else (
            "warn" if (forecast.get("minimum", 0) or 0) < (forecast.get("current_balance", 0) or 0) * 0.2
            else "success"
        ),
        "response_tone": "warning" if forecast.get("gap_detected") else "info",
        "suggested_chips": [
            "Кассовый прогноз на 14 дней",
            "Расходы за текущий месяц",
            "Сколько на счёте?",
        ],
        "action_buttons": [
            {"label": "Открыть выписку", "url": "/statement", "variant": "primary"},
            {"label": "Платежи на подпись", "url": "/payments", "variant": "secondary"},
        ],
    }
