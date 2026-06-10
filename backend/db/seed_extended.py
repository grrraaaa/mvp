"""Дополнительные seed-данные: профиль, уведомления, сервисы, платежи для поиска."""
from __future__ import annotations

import uuid

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import BankDocument, BankService, OrganizationProfile, SmartNotification

EXTRA_DOCUMENTS = [
    {
        "doc_number": "№ 88",
        "doc_date": "15.03.2026",
        "doc_type": "Перевод в BYN",
        "counterparty": "Иванов А.В.",
        "amount": 50000.00,
        "currency": "BYN",
        "status": "Проведен",
        "purpose": "Оплата по договору поставки №12 от 01.03.2026",
    },
    {
        "doc_number": "№ 91",
        "doc_date": "20.03.2026",
        "doc_type": "Перевод в BYN",
        "counterparty": "Иванов А.В.",
        "amount": 12500.00,
        "currency": "BYN",
        "status": "Проведен",
        "purpose": "Частичная оплата счёта №45",
    },
    {
        "doc_number": "№ 93",
        "doc_date": "22.03.2026",
        "doc_type": "Перевод в BYN",
        "counterparty": "Иванов А.В.",
        "amount": 8750.00,
        "currency": "BYN",
        "status": "Проведен",
        "purpose": "Аванс по спецификации",
    },
    {
        "doc_number": "№ 97",
        "doc_date": "28.03.2026",
        "doc_type": "Счёт на оплату",
        "counterparty": 'ООО "Ромашка"',
        "amount": 4200.00,
        "currency": "BYN",
        "status": "Проведен",
        "purpose": "Счёт от ООО Ромашка за март 2026 — канцтовары",
    },
    {
        "doc_number": "№ 99",
        "doc_date": "30.03.2026",
        "doc_type": "Перевод в BYN",
        "counterparty": "Иванов А.В.",
        "amount": 50000.00,
        "currency": "BYN",
        "status": "Черновик",
        "purpose": "Платёж на 50 000 руб. от Иванова А.В.",
    },
]

SEED_NOTIFICATIONS = [
    {
        "title": "Отчётность",
        "body": "Срок подачи отчётности истекает через 2 дня.",
        "severity": "critical",
        "category": "tax",
        "action_url": "/salary/obligations",
        "action_label": "Обязательства",
        "due_date": "07.06.2026",
    },
]

SEED_SERVICES = [
    {
        "id": "salary",
        "name": "Зарплатный проект",
        "description": "Выплата зарплаты сотрудникам на карты. Требуется расчётный счёт.",
        "tariff": "от 0 BYN/мес при подключении пакета",
        "connect_url": "/salary",
        "keywords": "зарплат,зарплатный проект,ведомость",
    },
    {
        "id": "acquiring",
        "name": "Эквайринг",
        "description": "Приём платежей картами в торговых точках и онлайн.",
        "tariff": "от 1,2% с оборота",
        "connect_url": "/products/cards",
        "keywords": "эквайринг,терминал,карты",
    },
    {
        "id": "analytics",
        "name": "Бизнес-аналитика",
        "description": "Обороты, категории расходов, сравнение периодов.",
        "tariff": "включено в пакет СберБизнес",
        "connect_url": "/services/analytics",
        "keywords": "аналитик,расход,отчёт",
    },
]


async def seed_extended():
    async with AsyncSessionLocal() as session:
        org = await session.get(OrganizationProfile, "demo")
        if not org:
            session.add(
                OrganizationProfile(
                    id="demo",
                    org_name="DEMO ЮРИДИЧЕСКОЕ ЛИЦО",
                    user_role="businessman",
                    daily_payment_limit=5000.0,
                )
            )

        notif_exists = await session.execute(select(SmartNotification).limit(1))
        if not notif_exists.scalar_one_or_none():
            for row in SEED_NOTIFICATIONS:
                session.add(SmartNotification(id=str(uuid.uuid4()), org_id="demo", **row))

        svc_exists = await session.execute(select(BankService).limit(1))
        if not svc_exists.scalar_one_or_none():
            for row in SEED_SERVICES:
                session.add(BankService(**row))

        for row in EXTRA_DOCUMENTS:
            exists = await session.execute(
                select(BankDocument).where(BankDocument.doc_number == row["doc_number"])
            )
            if not exists.scalar_one_or_none():
                session.add(BankDocument(id=str(uuid.uuid4()), org_id="demo", **row))

        await session.commit()
