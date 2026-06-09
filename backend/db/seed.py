"""Seed data for products table — продукты СберБизнес (внутренние ссылки)."""
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
        "Овердрафт на расчётном счёте",
        "credit",
        12.5,
        "Кредитный лимит для покрытия кассовых разрывов",
        "credit_overdraft",
    ),
    _p(
        "Инвестиционный кредит",
        "credit",
        8.5,
        "Финансирование развития и закупок для бизнеса",
        "credit_investment",
    ),
    _p(
        "Кредитная линия",
        "credit",
        9.2,
        "Возобновляемый лимит под оборот организации",
        "credit_line",
    ),
    _p(
        "Депозит «Стандарт»",
        "deposit",
        7.5,
        "Размещение свободных средств на 3–12 месяцев",
        "deposit_standard",
    ),
    _p(
        "Депозит «Гибкий»",
        "deposit",
        6.8,
        "Частичное снятие без потери процентов",
        "deposit_flexible",
    ),
    _p(
        "Visa Business",
        "cards",
        0.0,
        "Корпоративная карта для расходов организации",
        "corp_card",
    ),
]


async def seed_products():
    """Итеративный upsert: если продукт уже есть — обновляем поля, иначе создаём.
    Так новые SEED_PRODUCTS досиживаются при последующих деплоях.
    """
    async with AsyncSessionLocal() as session:
        for p in SEED_PRODUCTS:
            existing = await session.execute(
                select(Product).where(Product.name == p["name"])
            )
            row = existing.scalar_one_or_none()
            if row:
                row.type = p["type"]
                row.rate = p["rate"]
                row.description = p["description"]
                row.url = p["url"]
            else:
                session.add(Product(id=str(uuid.uuid4()), **p))
        await session.commit()

