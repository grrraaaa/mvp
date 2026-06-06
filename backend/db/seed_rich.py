"""Расширенные демо-данные для всех организаций (идемпотентно, Postgres + Vercel)."""
from __future__ import annotations

import uuid

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import BankDocument, Counterparty, Employee, SmartNotification

# ─── Дополнительные документы по org_id ───────────────────────────────────────

RICH_DOCUMENTS: dict[str, list[dict]] = {
    "demo": [
        {"doc_number": "№ 78", "doc_date": "10.03.2026", "doc_type": "Перевод в BYN", "counterparty": "ООО БелТорг", "amount": 8900.00, "currency": "BYN", "status": "Проведен", "purpose": "Закупка товаров по договору №45"},
        {"doc_number": "№ 81", "doc_date": "18.03.2026", "doc_type": "Перевод в BYN", "counterparty": "ООО АльфаИнвест", "amount": 5600.00, "currency": "BYN", "status": "Проведен", "purpose": "Аренда офиса — март 2026"},
        {"doc_number": "№ 86", "doc_date": "25.03.2026", "doc_type": "Счёт на оплату", "counterparty": 'ООО "Ромашка"', "amount": 2100.00, "currency": "BYN", "status": "Проведен", "purpose": "Канцтовары и расходники"},
        {"doc_number": "№ 100", "doc_date": "02.06.2026", "doc_type": "Перевод в BYN", "counterparty": "ООО БелТелесистемы", "amount": 890.00, "currency": "BYN", "status": "На подписи", "purpose": "Оплата интернета и телефонии"},
        {"doc_number": "№ 101", "doc_date": "03.06.2026", "doc_type": "Перевод в BYN", "counterparty": "Министерство финансов", "amount": 3200.00, "currency": "BYN", "status": "Черновик", "purpose": "НДС за май 2026"},
        {"doc_number": "№ 103", "doc_date": "04.06.2026", "doc_type": "Покупка валюты", "counterparty": "ОАО Сбер Банк", "amount": 1200.00, "currency": "USD", "status": "Проведен", "purpose": "Покупка USD для импортного контракта"},
    ],
    "ip_ivanov": [
        {"doc_number": "№ 8", "doc_date": "05.03.2026", "doc_type": "Перевод в BYN", "counterparty": "Иванов А.В.", "amount": 5000.00, "currency": "BYN", "status": "Проведен", "purpose": "Оплата услуг — март"},
        {"doc_number": "№ 10", "doc_date": "12.03.2026", "doc_type": "Перевод в BYN", "counterparty": 'ООО "СтройМат"', "amount": 2800.00, "currency": "BYN", "status": "Проведен", "purpose": "Стройматериалы для объекта"},
        {"doc_number": "№ 14", "doc_date": "25.05.2026", "doc_type": "Перевод в BYN", "counterparty": "ИП Козлов", "amount": 950.00, "currency": "BYN", "status": "Проведен", "purpose": "Ремонт оборудования"},
        {"doc_number": "№ 16", "doc_date": "01.06.2026", "doc_type": "Перевод в BYN", "counterparty": "ООО БелТелесистемы", "amount": 420.00, "currency": "BYN", "status": "На подписи", "purpose": "Связь — июнь 2026"},
        {"doc_number": "№ 17", "doc_date": "03.06.2026", "doc_type": "Перевод в BYN", "counterparty": "Министерство финансов", "amount": 890.00, "currency": "BYN", "status": "Черновик", "purpose": "Подоходный налог ИП"},
    ],
    "buh_plus": [
        {"doc_number": "№ 470", "doc_date": "15.03.2026", "doc_type": "Перевод в BYN", "counterparty": 'ООО "Поставщик Плюс"', "amount": 18900.00, "currency": "BYN", "status": "Проведен", "purpose": "Поставка канцтоваров Q1"},
        {"doc_number": "№ 475", "doc_date": "22.03.2026", "doc_type": "Перевод в BYN", "counterparty": "ФСЗН", "amount": 5980.00, "currency": "BYN", "status": "Проведен", "purpose": "Взносы ФСЗН — март"},
        {"doc_number": "№ 490", "doc_date": "10.05.2026", "doc_type": "Зарплатный проект", "counterparty": "Зарплатный реестр (8 сотр.)", "amount": 17200.00, "currency": "BYN", "status": "Проведен", "purpose": "Зарплата за апрель"},
        {"doc_number": "№ 504", "doc_date": "06.06.2026", "doc_type": "Перевод в BYN", "counterparty": 'ООО "Логистик BY"', "amount": 4800.00, "currency": "BYN", "status": "На подписи", "purpose": "Логистика — доставка на склад"},
        {"doc_number": "№ 505", "doc_date": "06.06.2026", "doc_type": "Перевод в BYN", "counterparty": "ООО АльфаИнвест", "amount": 8900.00, "currency": "BYN", "status": "Черновик", "purpose": "Аренда — черновик"},
        {"doc_number": "№ 506", "doc_date": "05.06.2026", "doc_type": "Покупка валюты", "counterparty": "ОАО Сбер Банк", "amount": 5000.00, "currency": "EUR", "status": "Проведен", "purpose": "Закупка EUR для контракта"},
    ],
}

RICH_COUNTERPARTIES: dict[str, list[dict]] = {
    "demo": [
        {"name": 'ООО "Ромашка"', "unp": "190123456", "account": "BY13 BPSB 3012 1111 1111 1111 1111", "bank_name": "БПС-Сбербанк"},
        {"name": "ООО БелТелесистемы", "unp": "190823432", "account": "BY55 BPSB 3012 7777 7777 7777 7777", "bank_name": "БПС-Сбербанк"},
    ],
    "ip_ivanov": [
        {"name": 'ООО "СтройМат"', "unp": "191234567", "account": "BY22 BPSB 3012 3333 3333 3333 3333", "bank_name": "БПС-Сбербанк"},
        {"name": "ИП Козлов", "unp": "192345612", "account": "BY11 BPSB 3012 2222 2222 2222 2222", "bank_name": "БПС-Сбербанк"},
        {"name": "Министерство финансов", "unp": "100000001", "account": "BY80 AKBB 3012 0000 0000 0000 0001", "bank_name": "Минфин РБ"},
    ],
    "buh_plus": [
        {"name": 'ООО "Поставщик Плюс"', "unp": "192345678", "account": "BY44 BPSB 3012 5555 5555 5555 5555", "bank_name": "БПС-Сбербанк"},
        {"name": 'ООО "Логистик BY"', "unp": "193456789", "account": "BY66 BPSB 3012 6666 6666 6666 6661", "bank_name": "БПС-Сбербанк"},
        {"name": "Министерство финансов", "unp": "100000001", "account": "BY80 AKBB 3012 0000 0000 0000 0001", "bank_name": "Минфин РБ"},
    ],
}

RICH_EMPLOYEES: dict[str, list[dict]] = {
    "buh_plus": [
        {"id": "buh-EMP-06", "full_name": "Егоров Сергей", "card_mask": "**** 7766", "amount": 1980.00, "status": "Готов"},
        {"id": "buh-EMP-07", "full_name": "Жукова Ольга", "card_mask": "**** 8877", "amount": 2150.00, "status": "Готов"},
        {"id": "buh-EMP-08", "full_name": "Зайцев Павел", "card_mask": "**** 9988", "amount": 2300.00, "status": "На подписи"},
    ],
}

RICH_NOTIFICATIONS: dict[str, list[dict]] = {
    "demo": [
        {"title": "Кассовый прогноз", "body": "Прогноз остатка показывает возможный дефицит через 7 дней.", "severity": "warn", "category": "analytics", "action_url": "/statement", "action_label": "Выписка", "due_date": "12.06.2026"},
        {"title": "Документ на подписи", "body": "Платёж №100 ожидает подписи.", "severity": "warn", "category": "document", "action_url": "/other/documents/signing", "action_label": "Подписать", "due_date": None},
    ],
    "ip_ivanov": [
        {"title": "Платёж на подписи", "body": "Платёж №16 (БелТелесистемы) ожидает подписи.", "severity": "warn", "category": "document", "action_url": "/other/documents/signing", "action_label": "Подписать", "due_date": "08.06.2026"},
        {"title": "Поставщик", "body": "Через 5 дней оплата ООО «СтройМат» по графику.", "severity": "info", "category": "payment", "action_url": "/payments", "action_label": "Создать платёж", "due_date": "11.06.2026"},
        {"title": "Налог ИП", "body": "Напоминание: подоходный налог до 15.06.", "severity": "critical", "category": "tax", "action_url": "/payments/paydocbyn", "action_label": "Оплатить", "due_date": "15.06.2026"},
    ],
    "buh_plus": [
        {"title": "Зарплата 8 сотрудников", "body": "Подготовьте ведомость на 8 сотрудников до 10.06.", "severity": "info", "category": "payment", "action_url": "/salary", "action_label": "Зарплатный проект", "due_date": "10.06.2026"},
        {"title": "Документ на подписи", "body": "Платёж №503 ожидает подписи.", "severity": "warn", "category": "document", "action_url": "/other/documents/signing", "action_label": "Открыть на подпись", "due_date": None},
        {"title": "Отчётность", "body": "Срок подачи отчётности через 2 дня.", "severity": "critical", "category": "tax", "action_url": "/salary/obligations", "action_label": "Обязательства", "due_date": "07.06.2026"},
        {"title": "Сумма выше среднего", "body": "Платёж ООО «Поставщик Плюс» превышает среднее по контрагенту.", "severity": "warn", "category": "payment", "action_url": "/payments", "action_label": "Проверить", "due_date": None},
    ],
}


async def _exists_doc(session, org_id: str, doc_number: str) -> bool:
    r = await session.execute(
        select(BankDocument).where(BankDocument.org_id == org_id, BankDocument.doc_number == doc_number)
    )
    return r.scalar_one_or_none() is not None


async def _exists_cp(session, org_id: str, name: str) -> bool:
    r = await session.execute(
        select(Counterparty).where(Counterparty.org_id == org_id, Counterparty.name == name)
    )
    return r.scalar_one_or_none() is not None


async def seed_rich():
    async with AsyncSessionLocal() as session:
        for org_id, docs in RICH_DOCUMENTS.items():
            for row in docs:
                if await _exists_doc(session, org_id, row["doc_number"]):
                    continue
                session.add(BankDocument(id=str(uuid.uuid4()), org_id=org_id, **row))

        for org_id, rows in RICH_COUNTERPARTIES.items():
            for row in rows:
                if await _exists_cp(session, org_id, row["name"]):
                    continue
                session.add(Counterparty(id=str(uuid.uuid4()), org_id=org_id, **row))

        for org_id, rows in RICH_EMPLOYEES.items():
            for row in rows:
                r = await session.execute(select(Employee).where(Employee.id == row["id"]))
                if r.scalar_one_or_none():
                    continue
                session.add(Employee(org_id=org_id, **row))

        for org_id, rows in RICH_NOTIFICATIONS.items():
            for row in rows:
                r = await session.execute(
                    select(SmartNotification).where(
                        SmartNotification.org_id == org_id,
                        SmartNotification.title == row["title"],
                    )
                )
                if r.scalar_one_or_none():
                    continue
                session.add(SmartNotification(id=str(uuid.uuid4()), org_id=org_id, **row))

        await session.commit()
