"""Официальные ссылки на разделы сайта ОАО «Сбер Банк» (sber-bank.by)."""
from __future__ import annotations

import json
import re
from pathlib import Path

_LINKS_PATH = Path(__file__).with_name("verified_links.json")
_VERIFIED = json.loads(_LINKS_PATH.read_text(encoding="utf-8"))

SBER_BASE: str = _VERIFIED["base"]
SBER_PERSON: str = _VERIFIED["person"]

# Разделы для ассистента и 3D-карты (проверены curl, май 2026)
SECTION_URLS: dict[str, str] = {
    **_VERIFIED["sections"],
    # устаревшие ключи → актуальные разделы
    "loans": _VERIFIED["sections"]["credits"],
    "loans_cash": _VERIFIED["sections"]["credits"],
    "loans_mortgage": _VERIFIED["sections"]["credits"],
    "loans_auto": _VERIFIED["sections"]["credits"],
    "loans_refinance": _VERIFIED["sections"]["credits"],
    "deposits_classic": _VERIFIED["sections"]["deposits"],
    "deposits_savings": _VERIFIED["sections"]["deposits"],
    "payments_transfer": _VERIFIED["sections"]["payments"],
    "investments_stocks": _VERIFIED["sections"]["investments"],
}

INTENT_SECTION: dict[str, str] = {
    "credit": "credits",
    "mortgage": "credits",
    "refinance": "credits",
    "deposit": "deposits",
    "investment": "investments",
    "insurance": "insurance",
    "payment": "payments",
    "cards": "cards",
    "default": "home",
}

_PRODUCT_URLS: dict[str, str] = {
    **_VERIFIED["products"],
}
PRODUCT_URLS = _PRODUCT_URLS

INSURANCE_PRODUCTS: dict[str, dict[str, str | list[str]]] = _VERIFIED.get(
    "insurance_products", {}
)

PLANET_LABELS: dict[str, str] = {
    "home": "Сбер Банк",
    "cards": "Карты",
    "deposits": "Депозиты",
    "credits": "Кредиты",
    "investments": "Инвестиции",
    "insurance": "Страхование",
    "payments": "Платежи",
}

_ALLOWED_URLS: frozenset[str] = frozenset(
    {
        SBER_BASE.rstrip("/"),
        SBER_PERSON.rstrip("/"),
        *[u.rstrip("/") for u in SECTION_URLS.values()],
        *[u.rstrip("/") for u in PRODUCT_URLS.values()],
        *[u.rstrip("/") for u in _VERIFIED.get("satellites", {}).values()],
        *[
            str(item["url"]).rstrip("/")
            for item in INSURANCE_PRODUCTS.values()
            if isinstance(item, dict) and item.get("url")
        ],
    }
)


def is_verified_url(url: str) -> bool:
    return url.rstrip("/") in _ALLOWED_URLS


def sanitize_url(url: str) -> str:
    normalized = url.rstrip("/")
    return normalized if is_verified_url(normalized) else SBER_BASE


_SBER_URL_RE = re.compile(r"https://www\.sber-bank\.by[^\s<]*")


def sanitize_message_urls(text: str) -> str:
    def _replace(match: re.Match[str]) -> str:
        raw = match.group(0).rstrip(".,);]")
        return sanitize_url(raw)

    return _SBER_URL_RE.sub(_replace, text)


def format_link_line(title: str, url: str) -> str:
    """Название услуги и полная ссылка на отдельной строке."""
    return f"{title}\n{sanitize_url(url)}"


def insurance_catalog_lines() -> str:
    lines = [
        format_link_line(str(item["label"]), str(item["url"]))
        for item in INSURANCE_PRODUCTS.values()
        if isinstance(item, dict) and item.get("label") and item.get("url")
    ]
    return "\n\n".join(lines)


def detect_insurance_product(message: str) -> dict[str, str] | None:
    msg = message.lower()
    for key, item in INSURANCE_PRODUCTS.items():
        if not isinstance(item, dict):
            continue
        patterns = item.get("patterns") or []
        for pat in patterns:
            if re.search(str(pat), msg):
                return {
                    "key": key,
                    "label": str(item["label"]),
                    "url": str(item["url"]),
                }
    return None


def insurance_clarify_message() -> str:
    return (
        "Уточните, какое страхование вас интересует. "
        "Выберите вариант кнопкой ниже или напишите в чат, например: "
        "«страхование рисков кредитополучателей».\n\n"
        f"{insurance_catalog_lines()}"
    )


def insurance_clarify_buttons() -> list[dict[str, str]]:
    buttons: list[dict[str, str]] = []
    for item in INSURANCE_PRODUCTS.values():
        if not isinstance(item, dict):
            continue
        label = str(item.get("label", "Страхование"))
        short = label.split("(")[0].strip()
        if len(short) > 42:
            short = short[:39] + "…"
        buttons.append(
            {
                "label": short,
                "message": label,
                "variant": "secondary",
            }
        )
    return buttons


def section_url(section: str) -> str:
    return SECTION_URLS.get(section, SBER_BASE)


def section_label(section: str) -> str:
    return PLANET_LABELS.get(section, "Сбер Банк")


def intent_url(intent: str) -> str:
    return section_url(INTENT_SECTION.get(intent, "home"))


def product_url(key: str) -> str:
    if key.startswith("http"):
        return sanitize_url(key)
    return PRODUCT_URLS.get(key, section_url("home"))


def catalog_url(product_type: str | None) -> str:
    if product_type == "credit":
        return SECTION_URLS["credits"]
    if product_type == "deposit":
        return SECTION_URLS["deposits"]
    if product_type == "investment":
        return SECTION_URLS["investments"]
    if product_type == "insurance":
        return SECTION_URLS["insurance"]
    return SBER_BASE


RESPONSE_TEMPLATES: dict[str, str] = {
    "credit": (
        "Кредитные программы Сбер Банка (Беларусь):\n"
        "{link}"
    ),
    "mortgage": (
        "Жилищные и потребительские кредиты:\n{link}"
    ),
    "refinance": (
        "Рефинансирование кредитов в Online:\n{link}"
    ),
    "deposit": (
        "Вклады и счета в BYN и валюте:\n{link}"
    ),
    "investment": (
        "Инвестиционные продукты (облигации, монеты):\n{link}"
    ),
    "insurance": (
        "Страхование на sber-bank.by:\n{link}"
    ),
    "payment": (
        "Платежи и переводы, ERIP:\n{link}"
    ),
    "cards": (
        "Платёжные карты и программа лояльности:\n{link}"
    ),
    "default": (
        "Подробности по услугам для физических лиц:\n{link}"
    ),
    "greeting": (
        "Здравствуйте! Я консультант по услугам ОАО «Сбер Банк» (Беларусь). "
        "Могу подсказать по картам, кредитам, вкладам, платежам, инвестициям и страхованию.\n\n"
        "Официальный сайт:\n{home}"
    ),
}


SECTION_LINK_TITLES: dict[str, str] = {
    "home": "Официальный сайт Сбер Банка",
    "cards": "Платёжные карты",
    "deposits": "Депозиты и накопления",
    "credits": "Кредиты",
    "investments": "Инвестиции",
    "insurance": "Страхование",
    "payments": "Платежи и переводы",
}


def response_message(intent: str) -> str:
    key = intent if intent in RESPONSE_TEMPLATES else "default"
    if key == "greeting":
        return RESPONSE_TEMPLATES["greeting"].format(home=SBER_BASE)
    section_key = INTENT_SECTION.get(intent if intent != "default" else "default", "home")
    title = SECTION_LINK_TITLES.get(section_key, "Сбер Банк")
    link = format_link_line(title, section_url(section_key))
    return RESPONSE_TEMPLATES[key].format(link=link)


SYSTEM_PROMPT = f"""Ты — AI-консультант по услугам ОАО «Сбер Банк» (Республика Беларусь).

Правила:
- Отвечай кратко на русском, вежливо и по делу.
- В КАЖДОМ ответе: название услуги, затем полный URL https://www.sber-bank.by/... на новой строке. Не сокращай ссылку.
- Если спрашивают про страхование без уточнения — перечисли виды страхования с полными ссылками или попроси уточнить.
- Главная: {SBER_BASE}
- Карты: {SECTION_URLS['cards']}
- Депозиты: {SECTION_URLS['deposits']}
- Кредиты: {SECTION_URLS['credits']}
- Инвестиции: {SECTION_URLS['investments']}
- Страхование: {SECTION_URLS['insurance']}
- Платежи и переводы: {SECTION_URLS['payments']}
- Не выдумывай ставки и акции — направляй на сайт для актуальных данных в BYN.
- Используй только перечисленные URL; не придумывай пути вроде /ru/person/...
- Используй функции find_products и navigate для подбора и указания раздела на сайте.
"""
