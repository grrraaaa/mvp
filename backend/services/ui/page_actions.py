"""Реестр действий UI по страницам — ассистент может нажимать кнопки и открывать модалки."""
from __future__ import annotations

import re
from typing import Optional

from models.schemas import ActionButton, AssistantResponse, UiAction
from services.navigation.demo_routes import (
    DEMO_ROUTE_LABELS,
    is_specific_demo_route,
    match_demo_route,
    resolve_navigation_route,
)

# target = data-assistant-action на фронте или navigate URL
PAGE_REGISTRY: dict[str, list[dict]] = {
    "/": [
        {"target": "open-payment-instant", "labels": ["мгновенный платеж", "мгновенн платеж", "создай мгновенн", "создать мгновенн"], "navigate": "/payments/instant"},
        {"target": "open-payment-byn", "labels": ["платёжное поручение", "поручение byn", "создай поручен", "создать поручен"], "navigate": "/payments/paydocbyn"},
        {"target": "open-payment-cur", "labels": ["перевод в инвалюте", "валютный перевод", "инвалют"], "navigate": "/payments/paydoccur"},
        {"target": "create-document", "labels": ["создать документ", "новый документ"]},
        {"target": "open-payments", "labels": ["расчёты", "платежи", "перейди в расчёты"], "navigate": "/payments"},
        {"target": "open-statement", "labels": ["выписка", "выписку"], "navigate": "/statement"},
        {"target": "open-salary", "labels": ["зарплат", "ведомост"], "navigate": "/salary"},
        {"target": "open-services", "labels": ["сервис", "вспомогательн"], "navigate": "/services"},
    ],
    "/payments": [
        {"target": "open-payment-instant", "labels": ["мгновенный платеж", "мгновенн платеж", "создай мгновенн", "создать мгновенн", "instant"], "navigate": "/payments/instant"},
        {"target": "open-payment-byn", "labels": ["платёжное поручение", "поручение byn", "перевод в byn", "создай поручен"], "navigate": "/payments/paydocbyn"},
        {"target": "open-payment-cur", "labels": ["перевод в инвалюте", "инвалют", "валютн", "paydoccur"], "navigate": "/payments/paydoccur"},
        {"target": "open-doc-modal", "labels": ["создать документ", "тип документа", "новый документ"]},
    ],
    "/payments/paydocbyn": [
        {"target": "fill-form-help", "labels": ["помоги заполн", "заполни форм", "заполнить"]},
    ],
    "/payments/instant": [
        {"target": "fill-form-help", "labels": ["помоги заполн", "заполни форм"]},
    ],
    "/payments/paydoccur": [
        {"target": "fill-form-help", "labels": ["помоги заполн", "заполни форм"]},
    ],
    "/statement": [
        {"target": "open-statement-account", "labels": ["выписка по счёту", "счёт"], "navigate": "/statement/account"},
        {"target": "open-statement-cert", "labels": ["справк"], "navigate": "/statement/certificates"},
    ],
    "/salary": [
        {"target": "open-salary-project", "labels": ["зарплатный проект", "проект"], "navigate": "/salary/project"},
        {"target": "run-payroll", "labels": ["выплат", "оплатить зарплат", "провести ведомост", "запусти выплату"]},
        {"target": "open-employees", "labels": ["сотрудник", "реестр"], "navigate": "/salary/employees"},
        {"target": "open-statement", "labels": ["выписка", "выписку"], "navigate": "/statement/account"},
    ],
    "/statement/account": [
        {"target": "statement-month", "labels": ["за месяц", "выписка за месяц"], "navigate": "/statement/account"},
    ],
    "/services": [
        {"target": "open-onec-import", "labels": ["1с", "onec", "импорт из 1с", "синхрониз"], "navigate": "/services/onec"},
    ],
    "/other": [
        {"target": "open-info-requests", "labels": ["запрос выписк", "запрос информац", "выписк информац"], "navigate": "/other/info-requests"},
        {"target": "open-documents", "labels": ["документ"], "navigate": "/other/documents"},
    ],
    "/other/info-requests": [
        {"target": "create-info-request", "labels": ["создать документ", "новый запрос", "создать запрос"]},
    ],
    "/products": [
        {"target": "open-corpo-card-transfers", "labels": ["перевод на корпоративн", "переводы на корпоративн", "пополнение карточного"], "navigate": "/products/corpo-card-transfers"},
        {"target": "open-credits", "labels": ["кредит"], "navigate": "/products/credits"},
        {"target": "open-deposits", "labels": ["депозит", "вклад"], "navigate": "/products/deposits"},
        {"target": "open-cards", "labels": ["управление карт", "корпоративн карт"], "navigate": "/products/cards"},
        {"target": "open-card-order", "labels": ["получение карт", "бизнес-карт"], "navigate": "/products/card-order"},
        {"target": "open-deposit-open", "labels": ["открытие депозит"], "navigate": "/products/deposit-open"},
        {"target": "open-self-collection", "labels": ["самоинкассац"], "navigate": "/products/self-collection"},
        {"target": "open-marketplace", "labels": ["торговая площадка"], "navigate": "/products/marketplace"},
    ],
    "/products/corpo-card-transfers": [
        {"target": "create-corpo-transfer", "labels": ["создать документ", "новый перевод", "создать перевод"]},
        {"target": "import-corpo-transfer", "labels": ["импорт"]},
    ],
}

# Глобальные команды (любая страница)
GLOBAL_ACTIONS: list[dict] = [
    {"target": "open-chat", "labels": ["открой чат", "помощник"]},
    {"target": "open-doc-modal", "labels": ["создать документ", "новый документ"]},
]

CLICK_PATTERNS = [
    r"нажми\b",
    r"нажать\b",
    r"открой\b",
    r"открыть\b",
    r"открыва\b",
    r"перейди\b",
    r"перейти\b",
    r"покажи\b",
    r"показать\b",
    r"запусти\b",
    r"создай\b",
    r"создать\b",
    r"оформи\b",
    r"оформить\b",
    r"импорт",
    r"синхрониз",
    r"подключ",
    r"выплат",
    r"заполни\b",
    r"заполнить\b",
    r"помоги\b",
]


def _normalize_route(page_route: Optional[str]) -> str:
    if not page_route:
        return "/"
    return page_route.rstrip("/") or "/"


def _match_action(message: str, page_route: Optional[str]) -> Optional[dict]:
    msg = message.lower().strip()
    if not any(re.search(p, msg) for p in CLICK_PATTERNS):
        return None

    # Точный маршрут из реестра навигации (мгновенный платёж → /payments/instant)
    nav_route = resolve_navigation_route(message)
    if nav_route and is_specific_demo_route(nav_route):
        return {
            "target": f"nav-{nav_route}",
            "labels": [nav_route],
            "navigate": nav_route,
        }

    route = _normalize_route(page_route)
    candidates = PAGE_REGISTRY.get(route, []) + GLOBAL_ACTIONS

    # Точное совпадение по labels (длинные фразы первыми)
    best: Optional[dict] = None
    best_len = 0
    for item in candidates:
        for label in item.get("labels", []):
            if label in msg and len(label) > best_len:
                best = item
                best_len = len(label)

    if best:
        return best

    # Fallback: ключевые слова по маршруту
    if re.search(r"создать документ|новый документ", msg):
        return {"target": "open-doc-modal", "labels": ["документ"]}
    if re.search(r"мгновенн|instant|срочн\w*\s+платеж", msg):
        return {"target": "open-payment-instant", "labels": ["мгновенн"], "navigate": "/payments/instant"}
    if re.search(r"инвалют|валютн\w*\s+перевод|paydoccur", msg):
        return {"target": "open-payment-cur", "labels": ["инвалют"], "navigate": "/payments/paydoccur"}
    if re.search(r"платежн\w*\s+поручен|поручени\w*\s+byn|paydocby", msg):
        return {"target": "open-payment-byn", "labels": ["поручен"], "navigate": "/payments/paydocbyn"}
    if re.search(r"платёж|платеж|поручен", msg) and route in ("/", "/payments"):
        hub = match_demo_route(message)
        if hub and is_specific_demo_route(hub):
            return {"target": f"nav-{hub}", "navigate": hub}
        return {"target": "open-doc-modal", "labels": ["документ"]}

    return None


def handle_page_ui_action(
    message: str,
    session_id: str,
    page_route: Optional[str] = None,
) -> Optional[AssistantResponse]:
    """Выполнить UI-действие на текущей странице (клик, навигация, модалка)."""
    matched = _match_action(message, page_route)
    if not matched:
        return None

    target = matched["target"]
    navigate = matched.get("navigate")
    ui_actions: list[UiAction] = []

    if navigate:
        ui_actions.append(UiAction(type="navigate", target=navigate))
        label = DEMO_ROUTE_LABELS.get(navigate, navigate)
        return AssistantResponse(
            message=f"Открываю «{label}».",
            session_id=session_id,
            ui_actions=ui_actions,
            action_buttons=[ActionButton(label=f"Перейти: {label}", url=navigate, variant="primary")],
        )

    if target == "fill-form-help":
        return AssistantResponse(
            message="Напишите реквизиты: сумму, получателя, назначение — заполню форму на этой странице.",
            session_id=session_id,
            action_buttons=[
                ActionButton(label="Сумма 1500, аренда", message="Сумма 1500, назначение аренда офиса", variant="primary"),
            ],
        )

    ui_actions.append(UiAction(type="click", target=target))
    label_map = {
        "create-document": "Создаю документ…",
        "open-payment-byn": "Открываю форму платёжного поручения BYN…",
        "open-payment-instant": "Открываю мгновенный платёж…",
        "open-payment-cur": "Открываю перевод в инвалюте…",
        "open-doc-modal": "Открываю выбор типа документа…",
        "run-payroll": "Запускаю выплату зарплаты…",
    }
    return AssistantResponse(
        message=label_map.get(target, f"Выполняю действие: {target}"),
        session_id=session_id,
        ui_actions=ui_actions,
    )


def get_page_help(page_route: Optional[str]) -> str:
    """Краткая подсказка что ассистент может на странице."""
    route = _normalize_route(page_route)
    hints = PAGE_REGISTRY.get(route, [])
    if not hints:
        return "Могу перейти в раздел, создать документ, показать остаток или найти платёж."
    actions = ", ".join(h["labels"][0] for h in hints[:4])
    return f"На этой странице могу: {actions}."


def get_page_quick_actions(page_route: Optional[str]) -> list[ActionButton]:
    route = _normalize_route(page_route)
    buttons: list[ActionButton] = []
    for item in PAGE_REGISTRY.get(route, [])[:4]:
        if item.get("navigate"):
            buttons.append(ActionButton(label=item["labels"][0].capitalize(), url=item["navigate"], variant="secondary"))
        else:
            buttons.append(
                ActionButton(label=item["labels"][0].capitalize(), message=item["labels"][0], variant="secondary")
            )
    return buttons
