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
}

# Ordered: more specific routes first
_ROUTE_RULES: list[tuple[str, list[str]]] = [
    (
        "/payments/paydocbyn",
        [
            r"paydocbyn",
            r"paydocby\b",
            r"payorderby",
            r"payment_order_by",
            r"document/payment",
            r"платежн\w*\s+поручен",
            r"поручени\w*\s+byn",
            r"поручени\w*\s+бел",
            r"поручени\w*\s+внутри",
        ],
    ),
    (
        "/payments/instant",
        [
            r"/payments/instant",
            r"instant_payment",
            r"payment_order\b",
            r"мгновенн\w*\s+платеж",
            r"срочн\w*\s+платеж",
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
    r"перейд|переход|открой|открыть|покаж|показать|навигац|"
    r"перенес|веди|зайди|go\s+to|open\s+",
    re.I,
)

_CREATE_DOC = re.compile(
    r"создать\s+документ|новый\s+документ|создай\s+документ|"
    r"оформить\s+документ|выбрать\s+тип\s+документ",
    re.I,
)


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
        ("/statement", [r"выписк"]),
        ("/statement/certificates", [r"справк"]),
        ("/salary/project", [r"зарплатн\w*\s+проект"]),
        ("/salary", [r"зарплат"]),
        ("/", [r"главн", r"home"]),
    ]
    for route, patterns in weak_rules:
        for pat in patterns:
            if re.search(pat, msg, re.I):
                return route

    return None


def is_create_document_request(message: str) -> bool:
    return bool(_CREATE_DOC.search(message))


def build_demo_nav_path(route: str) -> List[NavigationStep]:
    """Breadcrumb steps for assistant navigation_path (internal URLs)."""
    steps = [NavigationStep(label="Главная", url="/", icon="home")]
    if route == "/":
        return steps

    if route.startswith("/payments"):
        steps.append(NavigationStep(label="Расчёты", url="/payments", icon="planet"))
        if route != "/payments":
            steps.append(
                NavigationStep(
                    label=DEMO_ROUTE_LABELS.get(route, route),
                    url=route,
                    icon="planet",
                )
            )
        return steps

    if route.startswith("/statement"):
        steps.append(NavigationStep(label="Выписка", url="/statement", icon="planet"))
        if route != "/statement":
            steps.append(
                NavigationStep(
                    label=DEMO_ROUTE_LABELS.get(route, route),
                    url=route,
                    icon="planet",
                )
            )
        return steps

    if route.startswith("/salary"):
        steps.append(NavigationStep(label="Зарплата", url="/salary", icon="planet"))
        if route != "/salary":
            steps.append(
                NavigationStep(
                    label=DEMO_ROUTE_LABELS.get(route, route),
                    url=route,
                    icon="planet",
                )
            )
        return steps

    label = DEMO_ROUTE_LABELS.get(route, route)
    steps.append(NavigationStep(label=label, url=route, icon="planet"))
    return steps
