"""Банковские данные по организациям (multi-tenant demo)."""
from __future__ import annotations

import re
import uuid

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import BankAccount, BankDocument, Counterparty, Employee, SmartNotification

TENANT_PACKAGES: dict[str, dict] = {
    "demo": {
        "accounts": [
            {"iban": "BY51 BPSB 3012 2222 2222 2933 2222", "account_type": "Текущий (расчетный) счет", "label": "крутой", "balance": 200.00, "currency": "BYN"},
            {"iban": "BY69 BPSB 3012 3333 3333 3933 3333", "account_type": "Карточный счет", "label": "Добрый счёт", "balance": 300.00, "currency": "BYN"},
            {"iban": "BY41 BPSB 3012 0000 0000 0978 0000", "account_type": "Текущий (расчетный) счет", "label": "заметка", "balance": 2000.00, "currency": "BYN"},
            {"iban": "BY18 BPSB 3012 1111 1111 0643 1111", "account_type": "Текущий (расчетный) счет", "label": "рублевый сейф", "balance": 3000.00, "currency": "BYN"},
            {"iban": "BY29 BPSB 3012 5555 5555 0840 5555", "account_type": "Текущий (расчетный) счет", "label": "долларовый", "balance": 0.00, "currency": "USD"},
        ],
        "documents": [
            {"doc_number": "№ 102", "doc_date": "05.06.2026", "doc_type": "Перевод в BYN", "counterparty": "Министерство финансов", "amount": 150.00, "currency": "BYN", "status": "Проведен", "purpose": "Оплата налоговых сборов за 2 квартал 2026"},
            {"doc_number": "№ 95", "doc_date": "03.06.2026", "doc_type": "Покупка валюты", "counterparty": "ОАО Сбер Банк", "amount": 3500.00, "currency": "BYN", "status": "Проведен", "purpose": "Покупка иностранной валюты"},
            {"doc_number": "№ 84", "doc_date": "01.06.2026", "doc_type": "Зарплатный проект", "counterparty": "Зарплатный реестр (3 сотр.)", "amount": 3250.00, "currency": "BYN", "status": "Проведен", "purpose": "Зарплата за май 2026"},
            {"doc_number": "№ 105", "doc_date": "05.06.2026", "doc_type": "Перевод в BYN", "counterparty": "ООО АльфаИнвест", "amount": 120.00, "currency": "BYN", "status": "На подписи", "purpose": "Оплата аренды офиса"},
        ],
        "employees": [
            {"id": "demo-EMP-01", "full_name": "Иванов Иван Иванович", "card_mask": "**** 1234", "amount": 1200.00, "status": "Готов"},
            {"id": "demo-EMP-02", "full_name": "Петров Петр Петрович", "card_mask": "**** 5678", "amount": 1100.00, "status": "Готов"},
            {"id": "demo-EMP-03", "full_name": "Сидоров Сергей Сергеевич", "card_mask": "**** 9012", "amount": 950.00, "status": "Готов"},
        ],
        "counterparties": [
            {"name": 'ООО "БелТорг"', "unp": "123456789", "account": "BY12 BPSB 3012 0000 0000 0000 0001", "bank_name": "БПС-Сбербанк"},
            {"name": "ООО АльфаИнвест", "unp": "190552317", "account": "BY70 BPSB 3012 4444 4444 4444 4444", "bank_name": "БПС-Сбербанк"},
        ],
        "notifications": [],
    },
    "ip_ivanov": {
        "accounts": [
            {"iban": "BY12 BPSB 3012 8888 8888 8888 8888", "account_type": "Текущий (расчетный) счет", "label": "основной", "balance": 12000.00, "currency": "BYN"},
            {"iban": "BY33 BPSB 3012 7777 7777 7777 7777", "account_type": "Карточный счет", "label": "карта ИП", "balance": 850.50, "currency": "BYN"},
            {"iban": "BY34 BPSB 3012 9999 9999 9999 9999", "account_type": "Текущий (расчетный) счет", "label": "долларовый", "balance": 250.00, "currency": "USD"},
        ],
        "documents": [
            {"doc_number": "№ 12", "doc_date": "28.05.2026", "doc_type": "Перевод в BYN", "counterparty": "ООО БелТелесистемы", "amount": 420.00, "currency": "BYN", "status": "Проведен", "purpose": "Оплата связи"},
            {"doc_number": "№ 15", "doc_date": "02.06.2026", "doc_type": "Перевод в BYN", "counterparty": "ИП Козлов", "amount": 1500.00, "currency": "BYN", "status": "Проведен", "purpose": "Подрядные работы"},
        ],
        "employees": [],
        "counterparties": [
            {"name": "ООО БелТелесистемы", "unp": "190823432", "account": "BY55 BPSB 3012 7777 7777 7777 7777", "bank_name": "БПС-Сбербанк"},
        ],
        "notifications": [
            {"title": "Налог ИП", "body": "Напоминание: уплата подоходного налога до 15.06.", "severity": "warn", "category": "tax", "action_url": "/payments", "action_label": "Создать платёж", "due_date": "15.06.2026"},
        ],
    },
    "buh_plus": {
        "accounts": [
            {"iban": "BY90 BPSB 3012 6666 6666 6666 6666", "account_type": "Текущий (расчетный) счет", "label": "расчётный", "balance": 458200.00, "currency": "BYN"},
            {"iban": "BY91 BPSB 3012 6666 6666 6666 6667", "account_type": "Текущий (расчетный) счет", "label": "зарплатный", "balance": 89500.00, "currency": "BYN"},
            {"iban": "BY92 BPSB 3012 6666 6666 6666 6668", "account_type": "Текущий (расчетный) счет", "label": "валютный", "balance": 12400.00, "currency": "USD"},
        ],
        "documents": [
            {"doc_number": "№ 501", "doc_date": "04.06.2026", "doc_type": "Зарплатный проект", "counterparty": "Зарплатный реестр (8 сотр.)", "amount": 18400.00, "currency": "BYN", "status": "Проведен", "purpose": "Зарплата за май"},
            {"doc_number": "№ 502", "doc_date": "05.06.2026", "doc_type": "Перевод в BYN", "counterparty": "ФСЗН", "amount": 6200.00, "currency": "BYN", "status": "Проведен", "purpose": "Страховые взносы за май"},
            {"doc_number": "№ 503", "doc_date": "05.06.2026", "doc_type": "Перевод в BYN", "counterparty": "ООО АльфаИнвест", "amount": 8900.00, "currency": "BYN", "status": "На подписи", "purpose": "Аренда офиса июнь"},
        ],
        "employees": [
            {"id": "buh-EMP-01", "full_name": "Алексеева Мария", "card_mask": "**** 2211", "amount": 2400.00, "status": "Готов"},
            {"id": "buh-EMP-02", "full_name": "Борисов Олег", "card_mask": "**** 3322", "amount": 2100.00, "status": "Готов"},
            {"id": "buh-EMP-03", "full_name": "Васильева Анна", "card_mask": "**** 4433", "amount": 1950.00, "status": "Готов"},
            {"id": "buh-EMP-04", "full_name": "Громов Дмитрий", "card_mask": "**** 5544", "amount": 2200.00, "status": "Готов"},
            {"id": "buh-EMP-05", "full_name": "Дмитриева Елена", "card_mask": "**** 6655", "amount": 2050.00, "status": "Готов"},
        ],
        "counterparties": [
            {"name": "ФСЗН", "unp": "100000002", "account": "BY80 AKBB 3012 0000 0000 0000 0004", "bank_name": "Минфин РБ"},
            {"name": "ООО АльфаИнвест", "unp": "190552317", "account": "BY70 BPSB 3012 4444 4444 4444 4444", "bank_name": "БПС-Сбербанк"},
        ],
        "notifications": [
            {"title": "Отчётность", "body": "Срок подачи отчётности истекает через 2 дня.", "severity": "critical", "category": "tax", "action_url": "/salary/obligations", "action_label": "Обязательства", "due_date": "07.06.2026"},
            {"title": "Зарплата", "body": "Подготовьте ведомость на 8 сотрудников.", "severity": "info", "category": "payment", "action_url": "/salary", "action_label": "Зарплатный проект", "due_date": "10.06.2026"},
        ],
    },
}


async def _org_has_data(session, org_id: str) -> bool:
    result = await session.execute(
        select(BankDocument).where(BankDocument.org_id == org_id).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def _upsert_accounts(session, org_id: str, accounts: list[dict]) -> None:
    for row in accounts:
        existing = await session.get(BankAccount, row["iban"])
        if existing:
            if existing.org_id == org_id:
                existing.account_type = row["account_type"]
                existing.label = row["label"]
                existing.balance = row["balance"]
                existing.currency = row["currency"]
            continue
        session.add(BankAccount(org_id=org_id, **row))


async def seed_tenants():
    async with AsyncSessionLocal() as session:
        for org_id, pkg in TENANT_PACKAGES.items():
            await _upsert_accounts(session, org_id, pkg.get("accounts", []))

            if await _org_has_data(session, org_id):
                continue

            for row in pkg.get("documents", []):
                num = re.sub(r"\D", "", row.get("doc_number", ""))
                doc_id = f"doc-{org_id}-{num}" if num else str(uuid.uuid4())
                session.add(BankDocument(id=doc_id, org_id=org_id, **row))

            for row in pkg.get("employees", []):
                session.add(Employee(org_id=org_id, **row))

            for row in pkg.get("counterparties", []):
                session.add(Counterparty(id=str(uuid.uuid4()), org_id=org_id, **row))

            for row in pkg.get("notifications", []):
                session.add(SmartNotification(id=str(uuid.uuid4()), org_id=org_id, **row))

        await session.commit()
