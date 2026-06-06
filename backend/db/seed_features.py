"""Seed data for features 11-32: tax, insurance, services, counterparty risk."""
from __future__ import annotations

import uuid

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import BankService, Counterparty, InsuranceProduct, TaxDeadline

TAX_DEADLINES = [
    {"code": "fszn_q2", "title": "ФСЗН — взносы за II квартал", "due_date": "15.07.2026", "org_type": "ul", "description": "Страховые взносы работодателя", "demo_amount": 5980.0},
    {"code": "fszn_ip", "title": "ФСЗН для ИП", "due_date": "15.07.2026", "org_type": "ip", "description": "Фиксированные взносы ИП", "demo_amount": 890.0},
    {"code": "vat_may", "title": "НДС за май 2026", "due_date": "20.06.2026", "org_type": "ul", "description": "Декларация и платёж НДС", "demo_amount": 3200.0},
    {"code": "income_tax", "title": "Подоходный налог (удержание)", "due_date": "15.06.2026", "org_type": "ul", "description": "Перечисление удержанного налога", "demo_amount": 2100.0},
    {"code": "income_ip", "title": "Подоходный налог ИП", "due_date": "15.06.2026", "org_type": "ip", "description": "Авансовый платёж ИП", "demo_amount": 450.0},
    {"code": "report_q1", "title": "Отчётность за I квартал", "due_date": "07.06.2026", "org_type": "all", "description": "Бухгалтерская отчётность", "demo_amount": None},
]

INSURANCE_PRODUCTS = [
    {"id": "ins_property", "name": "Страхование имущества юрлица", "category": "property", "description": "Офис, склад, оборудование — комплексное покрытие.", "premium_from": 420.0, "coverage": "до 500 000 BYN", "keywords": "имущество,офис,склад,пожар"},
    {"id": "ins_life", "name": "Страхование от несчастных случаев", "category": "life", "description": "Защита сотрудников при производственных рисках.", "premium_from": 180.0, "coverage": "до 50 000 BYN на сотрудника", "keywords": "сотрудник,жизнь,несчастный,труд"},
    {"id": "ins_credit", "name": "Страхование кредитных рисков", "category": "credit", "description": "Покрытие обязательств по кредитным договорам.", "premium_from": 350.0, "coverage": "до суммы кредита", "keywords": "кредит,залог,обеспечение"},
]

EXTRA_SERVICES = [
    {"id": "acquiring_std", "name": "Эквайринг «Стандарт»", "description": "Терминалы и онлайн-оплата для розницы.", "tariff": "1,8% с оборота", "connect_url": "/services/acquiring", "keywords": "эквайринг,терминал,стандарт"},
    {"id": "acquiring_opt", "name": "Эквайринг «Оптимум»", "description": "Сниженная ставка при обороте от 50 000 BYN/мес.", "tariff": "1,2% с оборота", "connect_url": "/services/acquiring", "keywords": "эквайринг,оптимум,тариф"},
    {"id": "analytics_pro", "name": "Бизнес-аналитика Pro", "description": "Категории расходов, прогноз кассового разрыва, алерты.", "tariff": "15 BYN/мес", "connect_url": "/services/analytics", "keywords": "аналитик,прогноз,разрыв"},
    {"id": "tariff_pack", "name": "Пакет «Бизнес Плюс»", "description": "Эквайринг + аналитика + зарплатный проект.", "tariff": "от 29 BYN/мес", "connect_url": "/services", "keywords": "тариф,пакет,плюс"},
]

COUNTERPARTY_RISK = {
    'ООО "Ромашка"': (82.0, "low", "Регулярный контрагент, платежи без просрочек."),
    "ООО БелТелесистемы": (71.0, "low", "Коммунальные услуги, стабильный поставщик."),
    "ООО АльфаИнвест": (58.0, "medium", "Аренда — проверьте актуальность договора."),
    'ООО "Поставщик Плюс"': (44.0, "medium", "Крупные суммы — рекомендуется доп. проверка."),
    'ООО "Логистик BY"': (38.0, "high", "Новый контрагент, ограниченная история операций."),
    'ООО "СтройМат"': (65.0, "medium", "ИП-контрагент, средний риск по отрасли."),
}


async def seed_features():
    async with AsyncSessionLocal() as session:
        for row in TAX_DEADLINES:
            exists = await session.execute(
                select(TaxDeadline).where(TaxDeadline.code == row["code"])
            )
            if not exists.scalar_one_or_none():
                session.add(TaxDeadline(id=str(uuid.uuid4()), **row))

        for row in INSURANCE_PRODUCTS:
            if not await session.get(InsuranceProduct, row["id"]):
                session.add(InsuranceProduct(**row))

        for row in EXTRA_SERVICES:
            if not await session.get(BankService, row["id"]):
                session.add(BankService(**row))

        result = await session.execute(select(Counterparty))
        for cp in result.scalars().all():
            risk = COUNTERPARTY_RISK.get(cp.name)
            if risk:
                cp.risk_score, cp.risk_level, cp.risk_notes = risk

        await session.commit()
