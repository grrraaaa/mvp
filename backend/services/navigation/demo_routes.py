"""Demo SBBOL clone — internal Next.js routes for AI navigation."""
from __future__ import annotations

import re
from typing import Optional, List

from models.schemas import NavigationStep

DEMO_ROUTE_LABELS: dict[str, str] = {
    "/": "Главная",
    "/payments": "Расчёты",
    "/payments/paydocbyn": "Платежное поручение BYN",
    "/payments/instant": "Мгновенный платеж",
    "/payments/paydoccur": "Перевод в инвалюте",
    "/payments/currency": "Покупка валюты",
    "/payments/order": "Заявление на платёж",
    "/payments/counterparties": "Контрагенты",
    "/statement": "Выписка",
    "/statement/account": "Выписка по счёту",
    "/statement/certificates": "Справки",
    "/salary": "Зарплата",
    "/salary/project": "Зарплатный проект",
    "/salary/employees": "Сотрудники",
    "/salary/obligations": "Обязательства",
    "/salary/pension": "Пенсионные отчисления",
    "/products": "Продукты и услуги",
    "/products/credits": "Кредиты",
    "/products/cards": "Корпоративные карты",
    "/products/corpo-card-transfers": "Переводы на корпоративные карты",
    "/products/deposits": "Депозиты",
    "/products/ved": "ВЭД",
    "/services": "Сервисы",
    "/services/analytics": "Бизнес-аналитика",
    "/services/exchange-rates": "Курсы валют",
    "/other/info-requests": "Запросы выписки, информации",
    "/other/documents/signing": "На подписании",
    "/settings": "Настройки",
}

# Ordered: more specific routes first (instant/currency before generic paydocbyn)
_ROUTE_RULES: list[tuple[str, list[str]]] = [
    (
        "/payments/instant",
        [
            r"/payments/instant",
            r"instant_payment",
            r"instant_payment_order",
            r"мгновенн\w*\s+платеж",
            r"срочн\w*\s+платеж",
            r"создай\s+мгновенн",
            r"создать\s+мгновенн",
            r"оформи\s+мгновенн",
        ],
    ),
    (
        "/payments/paydocbyn",
        [
            r"paydocbyn",
            r"paydocby\b",
            r"payorderby",
            r"payment_order_by",
            r"платежн\w*\s+поручен",
            r"поручени\w*\s+byn",
            r"поручени\w*\s+бел",
            r"поручени\w*\s+внутри",
            r"создай\s+платежн\w*\s+поручен",
            r"создать\s+платежн\w*\s+поручен",
        ],
    ),
    (
        "/payments/paydoccur",
        [
            r"paydoccur",
            r"инвалют",
            r"валютн\w*\s+перевод",
            r"перевод\s+инвалют",
            r"перевод\s+валют",
        ],
    ),
    (
        "/payments/currency",
        [
            r"/payments/currency",
            r"currbuy",
            r"покупк\w*\s+валют",
            r"купить\s+валют",
            r"покупка\s+валют",
        ],
    ),
    (
        "/payments/order",
        [
            r"/payments/order",
            r"applpaymentpayorderclaim",
            r"заявлен\w*\s+на\s+платеж",
            r"поручени\w*\s+на\s+платеж",
        ],
    ),
    (
        "/payments/counterparties",
        [
            r"/payments/counterparties",
            r"контрагент",
        ],
    ),
    (
        "/statement/account",
        [
            r"/statement/account",
            r"выписк\w*\s+по\s+счет",
            r"выписк\w*\s+счет",
        ],
    ),
    (
        "/statement/certificates",
        [
            r"/statement/certificates",
            r"справк\w*\s+по\s+счет",
            r"справк\w*\s+счет",
            r"получить\s+справк",
        ],
    ),
    (
        "/salary/project",
        [
            r"/salary/project",
            r"applsalaryproject",
            r"зарплатн\w*\s+проект",
        ],
    ),
    (
        "/salary/employees",
        [
            r"/salary/employees",
            r"cashlist",
            r"сотрудник",
            r"список\s+сотрудник",
        ],
    ),
    (
        "/payments",
        [
            r"/payments\b",
            r"sbbol\.bps-sberbank\.by/payments",
            r"расчёт",
            r"расчет",
            r"платежи\s+и\s+перевод",
            r"платеж\w*\s+и\s+перевод",
            r"создать\s+документ",
            r"новый\s+документ",
            r"создай\s+документ",
        ],
    ),
    (
        "/other/info-requests",
        [
            r"/other/info-requests",
            r"информационн\w*\s+запрос",
            r"запрос\w*\s+выписк",
            r"запросы\s+выписк",
            r"запрос\w*\s+информац",
            r"запрос\w*\s+остатк",
            r"информац\w*\s+по\s+счет",
            r"остаток\s+по\s+счет",
            r"забронированн\w*\s+средств",
            r"неисполненн\w*\s+обязательств",
        ],
    ),
    (
        "/statement",
        [
            r"/statement\b",
            r"sbbol\.bps-sberbank\.by/statement",
            r"выписк",
        ],
    ),
    (
        "/salary",
        [
            r"/salary\b",
            r"sbbol\.bps-sberbank\.by/salary",
            r"зарплат",
            r"выплат\w*\s+зарплат",
            r"payment_of_wages",
        ],
    ),
    (
        "/salary/obligations",
        [r"/salary/obligations", r"обязательств", r"obligations"],
    ),
    (
        "/salary/pension",
        [r"/salary/pension", r"пенси", r"pension"],
    ),
    (
        "/products/corpo-card-transfers",
        [
            r"/products/corpo-card-transfers",
            r"pay_doc_corpo_card",
            r"document/pay_doc_corpo_card",
            r"перевод\w*\s+на\s+корпоративн",
            r"пополнени\w*\s+карточн",
        ],
    ),
    (
        "/products/credits",
        [r"/products/credits", r"кредит", r"овердрафт"],
    ),
    (
        "/products/deposits",
        [r"/products/deposits", r"депозит", r"вклад"],
    ),
    (
        "/products/cards",
        [r"/products/cards", r"управлени\w*\s+карт", r"реестр\s+карт"],
    ),
    (
        "/products/ved",
        [r"/products/ved", r"вэд", r"валютн\w*\s+контрол"],
    ),
    (
        "/products",
        [r"/products\b", r"продукт", r"услуг\w*\s+для\s+бизнес"],
    ),
    (
        "/services/exchange-rates",
        [r"/services/exchange-rates", r"курс\w*\s+валют"],
    ),
    (
        "/services/analytics",
        [r"/services/analytics", r"аналитик"],
    ),
    (
        "/services/counterparty",
        [r"/services/counterparty", r"проверк\w*\s+контрагент"],
    ),
    (
        "/services",
        [r"/services\b", r"сервис"],
    ),
    (
        "/other/documents/signing",
        [r"на\s+подпис", r"подписан", r"/other/documents/signing"],
    ),
    (
        "/other",
        [r"/other\b", r"прочее"],
    ),
    (
        "/settings/security",
        [r"/settings/security", r"безопасност", r"эцп"],
    ),
    (
        "/settings",
        [r"/settings\b", r"настройк", r"профил"],
    ),
    (
        "/",
        [
            r"^главн",
            r"на\s+главн",
            r"деньги\s+и\s+событ",
            r"sbbol\.bps-sberbank\.by/?$",
            r"^домой$",
        ],
    ),
]

_NAV_VERBS = re.compile(
    r"перейд|перейти|переход|открой|открыть|открыв|покаж|показать|навигац|"
    r"перенес|веди|зайди|зайти|go\s+to|open\s+",
    re.I,
)

_CREATE_DOC = re.compile(
    r"создать\s+документ|новый\s+документ|создай\s+документ|"
    r"оформить\s+документ|выбрать\s+тип\s+документ",
    re.I,
)


def is_navigation_message(message: str) -> bool:
    """True if the message should open a demo section (same for «перейди» and «открой»)."""
    return match_demo_route(message) is not None


def match_demo_route(message: str) -> Optional[str]:
    """Map user message to an internal demo route, or None."""
    msg = message.lower().strip()

    for route, patterns in _ROUTE_RULES:
        for pat in patterns:
            if re.search(pat, msg, re.I):
                return route

    if not _NAV_VERBS.search(msg):
        return None

    weak_rules: list[tuple[str, list[str]]] = [
        ("/payments/paydocbyn", [r"поручен", r"платежк", r"byn"]),
        ("/payments/instant", [r"мгновенн", r"срочн"]),
        ("/payments/paydoccur", [r"инвалют", r"валютн\w*\s+перевод"]),
        ("/payments", [r"платеж", r"перевод", r"оплат", r"расчет", r"расчёт"]),
        ("/products/credits", [r"кредит", r"овердрафт"]),
        ("/products", [r"продукт"]),
        ("/services", [r"сервис", r"аналитик"]),
        ("/settings", [r"настройк"]),
        ("/statement", [r"выписк"]),
        ("/statement/certificates", [r"справк"]),
        ("/salary/project", [r"зарплатн\w*\s+проект"]),
        ("/salary", [r"зарплат"]),
        ("/", [r"главн", r"home"]),
        # Слабые правила, которые срабатывают ТОЛЬКО с глаголом навигации.
        # Без глагола (открой/перейди/покажи…) фраза «контрагент …» может
        # быть частью заполнения формы — например,
        # «наименование контрагента ООО Ромашка» не должна открывать раздел
        # «Контрагенты», а должна заполнить поле получателя в платёжке.
        ("/payments/counterparties", [r"контрагент", r"контрагентов", r"контрагента"]),
    ]
    for route, patterns in weak_rules:
        for pat in patterns:
            if re.search(pat, msg, re.I):
                return route

    return None


def is_create_document_request(message: str) -> bool:
    return bool(_CREATE_DOC.search(message))


def is_specific_demo_route(route: str) -> bool:
    """Leaf pages (forms, product lists) — prefer over generic section hubs."""
    if not route or route == "/":
        return False
    return route.count("/") >= 2


def resolve_navigation_route(message: str) -> Optional[str]:
    """Best route for «создай / открой …» — specific pages win over hubs."""
    route = match_demo_route(message)
    if not route:
        return None
    if is_specific_demo_route(route):
        return route
    return route


def build_demo_nav_path(route: str) -> List[NavigationStep]:
    """Breadcrumb steps for assistant navigation_path (internal URLs)."""
    steps = [NavigationStep(label="Главная", url="/", icon="home")]
    if route == "/":
        return steps

    if route.startswith("/payments"):
        steps.append(NavigationStep(label="Расчёты", url="/payments", icon="link"))
        if route != "/payments":
            steps.append(
                NavigationStep(
                    label=DEMO_ROUTE_LABELS.get(route, route),
                    url=route,
                    icon="link",
                )
            )
        return steps

    if route.startswith("/statement"):
        steps.append(NavigationStep(label="Выписка", url="/statement", icon="link"))
        if route != "/statement":
            steps.append(
                NavigationStep(
                    label=DEMO_ROUTE_LABELS.get(route, route),
                    url=route,
                    icon="link",
                )
            )
        return steps

    if route.startswith("/salary"):
        steps.append(NavigationStep(label="Зарплата", url="/salary", icon="link"))
        if route != "/salary":
            steps.append(
                NavigationStep(
                    label=DEMO_ROUTE_LABELS.get(route, route),
                    url=route,
                    icon="link",
                )
            )
        return steps

    for prefix, label in (
        ("/products", "Продукты"),
        ("/services", "Сервисы"),
        ("/other", "Прочее"),
        ("/settings", "Настройки"),
        ("/money", "Деньги и события"),
    ):
        if route.startswith(prefix):
            steps.append(NavigationStep(label=label, url=prefix if prefix != "/money" else "/", icon="link"))
            if route != prefix and not (prefix == "/money" and route == "/"):
                steps.append(
                    NavigationStep(
                        label=DEMO_ROUTE_LABELS.get(route, route),
                        url=route,
                        icon="link",
                    )
                )
            return steps

    label = DEMO_ROUTE_LABELS.get(route, route)
    steps.append(NavigationStep(label=label, url=route, icon="link"))
    return steps
