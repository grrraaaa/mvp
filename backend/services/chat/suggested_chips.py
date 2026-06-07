"""Dynamic quick-reply chips from context, form errors, last intent."""
from __future__ import annotations

import re
from typing import Any


def suggest_chips(
    *,
    message: str,
    response: dict[str, Any],
    page_route: str | None = None,
    form_type: str | None = None,
    user_role: str = "businessman",
) -> list[str]:
    chips: list[str] = []
    low = message.lower()

    pending = response.get("pending_form_fields") or []
    for label in pending[:3]:
        chips.append(f"Заполнить: {label}")

    if response.get("form_fill_status") in ("partial", "collecting"):
        chips.extend(["Сумма 1500", "Назначение — аренда", "Проверь реквизиты"])

    sources = response.get("sources") or []
    if sources and len(sources) <= 3:
        for s in sources[:2]:
            idx = s.get("index") if isinstance(s, dict) else getattr(s, "index", None)
            if idx:
                chips.append(f"Покажи источник №{idx}")

    charts = response.get("charts") or []
    if charts:
        chips.extend(["Кассовый разрыв", "Сравни февраль и март", "Риски по расходам"])

    if re.search(r"выписк", low):
        chips.extend(["Выписка за квартал", "Выписка за год", "Последние операции"])

    if re.search(r"найди|найти|поиск|покажи\s+карточк", low):
        chips.extend(["Открыть документ", "Связанные платежи", "Последние документы"])

    if re.search(r"остаток|сколько\s+(?:денег|средств)|баланс", low):
        chips.extend(["Детализация счетов", "Последние операции", "Расходы за март по категориям"])

    if re.search(r"ошибк|неверн|не\s+так", low):
        chips.extend(["Исправь УНП", "Проверь IBAN", "Уменьши сумму"])

    if re.search(r"эквайринг|тариф|сервис", low):
        chips.extend(["Сравни тарифы эквайринга", "Подключить аналитику"])

    if re.search(r"налог|фсзн|ндс", low):
        chips.extend(["Налоговый календарь", "Рассчитай ФСЗН"])

    if re.search(r"страхов", low):
        chips.extend(["Страхование имущества", "Страхование сотрудников"])

    if re.search(r"контрагент|поставщик", low):
        chips.extend(["Проверь контрагента", "Добавь контрагента"])

    role_defaults: dict[str, list[str]] = {
        "accountant": ["Выписка за месяц", "Обязательства ФСЗН", "Документы на подписи"],
        "ip": ["Сколько на счёте", "Мгновенный платёж", "Налог ИП"],
        "businessman": ["Создай платёж", "Остаток на счёте", "Синхронизировать с 1С"],
    }
    if not chips and page_route:
        route_chips: dict[str, list[str]] = {
            "/payments/paydocbyn": ["Сумма 2500", "Получатель Ромашка", "📷 Скан счёта"],
            "/payments/instant": ["Сумма 500", "Назначение — услуги"],
            "/statement": ["Выписка за месяц", "Последние операции"],
            "/salary": ["Запусти выплату зарплаты", "Сотрудники"],
            "/services": ["Эквайринг", "1С — документы к оплате"],
        }
        chips.extend(route_chips.get(page_route, [])[:3])

    if not chips:
        chips.extend(role_defaults.get(user_role, role_defaults["businessman"])[:3])

    seen: set[str] = set()
    unique: list[str] = []
    for c in chips:
        if c not in seen:
            seen.add(c)
            unique.append(c)
    return unique[:6]
