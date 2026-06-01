"""Seed data for products table — ссылки на sber-bank.by."""
from __future__ import annotations
from sqlalchemy import select
from db.database import AsyncSessionLocal
from db.models import Product
from services.sber_links import product_url
import uuid


def _p(
    name: str,
    type_: str,
    rate: float,
    description: str,
    url_key: str,
) -> dict:
    url = product_url(url_key) if not url_key.startswith("http") else url_key
    return {
        "name": name,
        "type": type_,
        "rate": rate,
        "description": description,
        "url": url,
    }


SEED_PRODUCTS = [
    _p(
        "Кредит «Просто в Online»",
        "credit",
        12.9,
        "На любые цели — условия на sber-bank.by",
        "credit_online",
    ),
    _p(
        "Автокредит у партнёров",
        "credit",
        1.9,
        "LADA и партнёрские программы — оформление на сайте",
        "credit_auto",
    ),
    _p(
        "Рефинансирование в Online",
        "credit",
        11.5,
        "Объединение кредитов — раздел кредитов",
        "credit_refinance",
    ),
    _p(
        "Вклад «Сберегай»",
        "deposit",
        14.0,
        "Безотзывный вклад в BYN — актуальная ставка на сайте",
        "deposit_save",
    ),
    _p(
        "Сервис «Копилка»",
        "deposit",
        8.0,
        "Онлайн-накопления — депозиты и счета",
        "deposit_kopilka",
    ),
    _p(
        "Облигации банка",
        "investment",
        10.0,
        "Инвестиционные продукты Сбер Банка",
        "invest_bonds",
    ),
    _p(
        "Инвестиционные монеты",
        "investment",
        0.0,
        "Монеты из драгоценных металлов",
        "invest_coins",
    ),
    _p(
        "Платёжные карты",
        "cards",
        0.0,
        "Карты, стикеры, программа «Спасибо»",
        "card_payment",
    ),
]


async def seed_products():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Product).limit(1))
        if result.scalar_one_or_none():
            return
        for p in SEED_PRODUCTS:
            session.add(Product(id=str(uuid.uuid4()), **p))
        await session.commit()
