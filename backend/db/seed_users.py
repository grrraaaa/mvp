"""Демо-пользователи с разными организациями."""
from __future__ import annotations

from sqlalchemy import select

from core.dependencies import hash_password
from db.database import AsyncSessionLocal
from db.models import OrganizationProfile, User

DEMO_USERS = [
    {
        "id": "user-demo",
        "login": "demo",
        "email": "demo@sbbol.demo",
        "password": "demo",
        "org_id": "demo",
        "display_name": "Демо ЮЛ",
    },
    {
        "id": "user-ip",
        "login": "ipivanov",
        "email": "ip@sbbol.demo",
        "password": "ip123",
        "org_id": "ip_ivanov",
        "display_name": "Иванов И.И.",
    },
    {
        "id": "user-buh",
        "login": "buhplus",
        "email": "buh@sbbol.demo",
        "password": "buh123",
        "org_id": "buh_plus",
        "display_name": "Главный бухгалтер",
    },
]

ORGS = [
    {
        "id": "demo",
        "org_name": "DEMO ЮРИДИЧЕСКОЕ ЛИЦО",
        "user_role": "businessman",
        "daily_payment_limit": 5000.0,
    },
    {
        "id": "ip_ivanov",
        "org_name": "ИП ИВАНОВ ИВАН ИВАНОВИЧ",
        "user_role": "ip",
        "daily_payment_limit": 3000.0,
    },
    {
        "id": "buh_plus",
        "org_name": 'ООО «БУХГАЛТЕРИЯ ПЛЮС»',
        "user_role": "accountant",
        "daily_payment_limit": 15000.0,
    },
]


async def seed_users():
    async with AsyncSessionLocal() as session:
        for org in ORGS:
            existing = await session.get(OrganizationProfile, org["id"])
            if existing:
                existing.org_name = org["org_name"]
                existing.user_role = org["user_role"]
                existing.daily_payment_limit = org["daily_payment_limit"]
            else:
                session.add(OrganizationProfile(**org))
            await session.flush()

        for row in DEMO_USERS:
            result = await session.execute(select(User).where(User.login == row["login"]))
            if result.scalar_one_or_none():
                continue
            session.add(
                User(
                    id=row["id"],
                    login=row["login"],
                    email=row["email"],
                    password_hash=hash_password(row["password"]),
                    org_id=row["org_id"],
                    display_name=row["display_name"],
                )
            )

        await session.commit()
