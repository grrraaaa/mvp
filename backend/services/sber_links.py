"""Ссылки и тексты ассистента — только СберБизнес (SBBOL), без retail sber-bank.by."""
from __future__ import annotations

import re

SBBOL_PROD = "https://sbbol.bps-sberbank.by"

# Внутренние маршруты демо (Next.js). В ответах ИИ — в приоритете пути вида /payments.
SECTION_PATHS: dict[str, str] = {
    "home": "/",
    "payments": "/payments",
    "statement": "/statement",
    "salary": "/salary",
    "products": "/products",
    "services": "/services",
    "other": "/other",
    "settings": "/settings",
    "credits": "/products/credits",
    "deposits": "/products/deposits",
    "cards": "/products/cards",
    "ved": "/products/ved",
    "counterparties": "/payments/counterparties",
    "analytics": "/services/analytics",
    "counterparty_check": "/services/counterparty",
    "exchange_rates": "/services/exchange-rates",
    "documents_signing": "/other/documents/signing",
}

SECTION_URLS = SECTION_PATHS

INTENT_SECTION: dict[str, str] = {
    "payments": "payments",
    "statement": "statement",
    "salary": "salary",
    "credit": "credits",
    "deposit": "deposits",
    "cards": "cards",
    "ved": "ved",
    "counterparty": "counterparties",
    "services": "services",
    "products": "products",
    "default": "home",
}

PRODUCT_PATHS: dict[str, str] = {
    "credit_overdraft": "/products/credits",
    "credit_investment": "/products/credits",
    "credit_line": "/products/credits",
    "deposit_standard": "/products/deposits",
    "deposit_flexible": "/products/deposits",
    "corp_card": "/products/cards",
    "payment_order": "/payments/paydocbyn",
    "counterparty": "/payments/counterparties",
}

PRODUCT_URLS = PRODUCT_PATHS

PLANET_LABELS: dict[str, str] = {
    "home": "Главная",
    "payments": "Расчёты",
    "statement": "Выписка",
    "salary": "Зарплата",
    "products": "Продукты",
    "services": "Сервисы",
    "other": "Прочее",
    "settings": "Настройки",
    "credits": "Кредиты",
    "deposits": "Депозиты",
    "cards": "Корпоративные карты",
    "ved": "ВЭД",
    "counterparties": "Контрагенты",
}

_ALLOWED_PATHS: frozenset[str] = frozenset(SECTION_PATHS.values())
_ALLOWED_EXTERNAL: frozenset[str] = frozenset({SBBOL_PROD.rstrip("/")})

_RETAIL_URL_RE = re.compile(r"https://(?:www\.)?sber-bank\.by[^\s<]*", re.I)
_SBBOL_URL_RE = re.compile(r"https://sbbol\.bps-sberbank\.by[^\s<]*", re.I)
_PATH_RE = re.compile(r"(?<![\w.])(/[\w\-/]+)")


def is_verified_url(url: str) -> bool:
    u = url.rstrip("/")
    if u in _ALLOWED_PATHS or u + "/" in _ALLOWED_PATHS:
        return True
    return u in _ALLOWED_EXTERNAL or u.startswith(SBBOL_PROD.rstrip("/"))


def sanitize_url(url: str) -> str:
    u = url.strip()
    if u.startswith("/"):
        base = u.split("?")[0].rstrip("/") or "/"
        for allowed in _ALLOWED_PATHS:
            if base == allowed or base.startswith(allowed + "/"):
                return base
        return "/"
    norm = u.rstrip("/")
    if norm in _ALLOWED_EXTERNAL or norm.startswith(SBBOL_PROD.rstrip("/")):
        return norm
    return "/"


def sanitize_message_urls(text: str) -> str:
    text = _RETAIL_URL_RE.sub(SBBOL_PROD, text)

    def _fix_sbbol(match: re.Match[str]) -> str:
        return sanitize_url(match.group(0).rstrip(".,);]"))

    return _SBBOL_URL_RE.sub(_fix_sbbol, text)


def format_link_line(title: str, url: str) -> str:
    return f"{title}\n{sanitize_url(url)}"


def detect_insurance_product(message: str) -> dict[str, str] | None:
    return None


def insurance_clarify_message() -> str:
    return (
        "В СберБизнес страхование оформляется через банк по запросу. "
        f"Откройте раздел «Продукты и услуги» или напишите «кредит для бизнеса».\n\n"
        f"{format_link_line('Продукты для бизнеса', '/products')}"
    )


def insurance_clarify_buttons() -> list[dict[str, str]]:
    return [
        {"label": "Кредиты", "message": "кредиты для бизнеса", "variant": "secondary"},
        {"label": "Продукты", "message": "продукты и услуги", "variant": "secondary"},
    ]


def section_url(section: str) -> str:
    return SECTION_PATHS.get(section, "/")


def section_label(section: str) -> str:
    return PLANET_LABELS.get(section, "СберБизнес")


def intent_url(intent: str) -> str:
    return section_url(INTENT_SECTION.get(intent, "home"))


def product_url(key: str) -> str:
    if key.startswith("/"):
        return sanitize_url(key)
    if key.startswith("http"):
        return sanitize_url(key)
    return PRODUCT_PATHS.get(key, "/products")


def catalog_url(product_type: str | None) -> str:
    if product_type == "credit":
        return "/products/credits"
    if product_type == "deposit":
        return "/products/deposits"
    if product_type == "investment":
        return "/products/ved"
    return "/products"


RESPONSE_TEMPLATES: dict[str, str] = {
    "payments": "Платежи и переводы в интернет-банке СберБизнес:\n{link}",
    "statement": "Выписки и справки по счетам организации:\n{link}",
    "salary": "Зарплатный проект и выплаты сотрудникам:\n{link}",
    "credit": "Кредитные продукты для бизнеса (овердрафт, инвестиционный кредит, линия):\n{link}",
    "deposit": "Депозиты для размещения свободных средств организации:\n{link}",
    "cards": "Корпоративные карты Visa Business и Mastercard:\n{link}",
    "ved": "Валютный контроль и документы ВЭД:\n{link}",
    "counterparty": "Справочник контрагентов и проверка партнёров:\n{link}",
    "services": "Сервисы для бизнеса: аналитика, курсы валют, обучение:\n{link}",
    "products": "Продукты и услуги для юридических лиц:\n{link}",
    "default": "Разделы интернет-банка СберБизнес:\n{link}",
    "greeting": (
        "Здравствуйте! Я консультант по СберБизнес — интернет-банку для организаций. "
        "Помогу с расчётами, выписками, зарплатой, кредитами и сервисами.\n\n"
        "Главная:\n{home}"
    ),
}

SECTION_LINK_TITLES: dict[str, str] = {
    "home": "Главная СберБизнес",
    "payments": "Расчёты",
    "statement": "Выписка",
    "salary": "Зарплата",
    "products": "Продукты и услуги",
    "services": "Сервисы",
    "credits": "Кредиты для бизнеса",
    "deposits": "Депозиты",
    "cards": "Корпоративные карты",
    "ved": "Валютный контроль и ВЭД",
    "counterparties": "Контрагенты",
}


def response_message(intent: str) -> str:
    key = intent if intent in RESPONSE_TEMPLATES else "default"
    if key == "greeting":
        return RESPONSE_TEMPLATES["greeting"].format(home="/")
    section_key = INTENT_SECTION.get(intent if intent != "default" else "default", "home")
    title = SECTION_LINK_TITLES.get(section_key, "СберБизнес")
    link = format_link_line(title, section_url(section_key))
    return RESPONSE_TEMPLATES[key].format(link=link)


SYSTEM_PROMPT = f"""Ты — AI-консультант интернет-банка **СберБизнес** (SBBOL) для юридических лиц и ИП в Беларуси.

Правила:
- Отвечай кратко на русском, только про бизнес-банкинг: расчёты, выписки, зарплата, продукты для организаций, сервисы, настройки.
- НЕ упоминай сайт для физических лиц (www.sber-bank.by, «СберПрайм», retail-карты, ERIP для частных лиц).
- В каждом ответе укажи раздел и ссылку: **внутренний путь** демо (например `/payments`) или официальный SBBOL: {SBBOL_PROD}/...
- Основные разделы:
  - Главная: /
  - Расчёты: /payments
  - Выписка: /statement
  - Зарплата: /salary
  - Продукты: /products (кредиты /products/credits, депозиты /products/deposits, карты /products/cards)
  - Сервисы: /services
  - Прочее: /other
  - Настройки: /settings
- Не выдумывай ставки — направляй в соответствующий раздел.
- Используй функции find_products и navigate для подбора продуктов и навигации по разделам SBBOL.
"""
