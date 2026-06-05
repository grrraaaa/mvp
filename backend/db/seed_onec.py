"""Seed данных эмулятора 1С — отдельные документы для каждой организации (PostgreSQL)."""
from __future__ import annotations

import uuid

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import BankDocument, OneCConnection, OneCDocument

# doc_kind: payment_request | tax | ttn | payroll | contract
ORG_ONEC_DOCS: dict[str, list[dict]] = {
    "demo": [
        {
            "external_id": "1C-DEMO-001",
            "doc_kind": "payment_request",
            "counterparty": 'ООО "Ромашка"',
            "unp": "190123456",
            "iban": "BY13 BPSB 3012 1111 1111 1111 1111",
            "bik": "BPSBBY2X",
            "amount": 4200.00,
            "purpose": "Счёт №97 от ООО Ромашка за март 2026 — канцтовары",
            "due_date": "10.06.2026",
        },
        {
            "external_id": "1C-DEMO-002",
            "doc_kind": "tax",
            "counterparty": "Министерство финансов РБ",
            "unp": "100000001",
            "iban": "BY80 AKBB 3012 0000 0000 0000 0001",
            "bik": "AKBBBY2X",
            "amount": 2800.00,
            "purpose": "Уплата НДС за май 2026",
            "payment_code": "02301",
            "due_date": "15.06.2026",
        },
        {
            "external_id": "1C-DEMO-003",
            "doc_kind": "contract",
            "counterparty": "ООО АльфаИнвест",
            "unp": "190552317",
            "iban": "BY70 BPSB 3012 4444 4444 4444 4444",
            "bik": "BPSBBY2X",
            "amount": 8900.00,
            "purpose": "Аренда офиса — очередной платёж по договору №12/2024",
            "due_date": "08.06.2026",
        },
        {
            "external_id": "1C-DEMO-004",
            "doc_kind": "ttn",
            "counterparty": 'ООО "БелТорг"',
            "unp": "123456789",
            "iban": "BY12 BPSB 3012 0000 0000 0000 0001",
            "bik": "BPSBBY2X",
            "amount": 3150.00,
            "purpose": "ТТН №8845 от 28.05.2026 — поставка канцелярии",
            "due_date": "12.06.2026",
        },
    ],
    "ip_ivanov": [
        {
            "external_id": "1C-IP-001",
            "doc_kind": "payment_request",
            "counterparty": "ООО БелТелесистемы",
            "unp": "190823432",
            "iban": "BY55 BPSB 3012 7777 7777 7777 7777",
            "bik": "BPSBBY2X",
            "amount": 420.00,
            "purpose": "Оплата услуг связи за май 2026",
            "due_date": "10.06.2026",
        },
        {
            "external_id": "1C-IP-002",
            "doc_kind": "tax",
            "counterparty": "Министерство финансов РБ",
            "unp": "100000001",
            "iban": "BY80 AKBB 3012 0000 0000 0000 0001",
            "bik": "AKBBBY2X",
            "amount": 890.00,
            "purpose": "Подоходный налог ИП за май 2026",
            "payment_code": "01001",
            "due_date": "15.06.2026",
        },
        {
            "external_id": "1C-IP-003",
            "doc_kind": "ttn",
            "counterparty": 'ООО "СтройМат"',
            "unp": "191234567",
            "iban": "BY22 BPSB 3012 3333 3333 3333 3333",
            "bik": "BPSBBY2X",
            "amount": 3200.00,
            "purpose": "ТТН №5521 — стройматериалы для объекта",
            "due_date": "14.06.2026",
        },
    ],
    "buh_plus": [
        {
            "external_id": "1C-BUH-001",
            "doc_kind": "payroll",
            "counterparty": "Зарплатный реестр (8 сотр.)",
            "unp": "",
            "iban": "",
            "bik": "",
            "amount": 18400.00,
            "purpose": "Зарплатная ведомость за май 2026 — 8 сотрудников",
            "due_date": "10.06.2026",
        },
        {
            "external_id": "1C-BUH-002",
            "doc_kind": "tax",
            "counterparty": "ФСЗН",
            "unp": "100000002",
            "iban": "BY80 AKBB 3012 0000 0000 0000 0004",
            "bik": "AKBBBY2X",
            "amount": 6200.00,
            "purpose": "Страховые взносы ФСЗН за май 2026",
            "payment_code": "03001",
            "due_date": "15.06.2026",
        },
        {
            "external_id": "1C-BUH-003",
            "doc_kind": "contract",
            "counterparty": "ООО АльфаИнвест",
            "unp": "190552317",
            "iban": "BY70 BPSB 3012 4444 4444 4444 4444",
            "bik": "BPSBBY2X",
            "amount": 8900.00,
            "purpose": "Аренда офиса — июнь 2026",
            "due_date": "05.06.2026",
        },
        {
            "external_id": "1C-BUH-004",
            "doc_kind": "payment_request",
            "counterparty": 'ООО "Поставщик Плюс"',
            "unp": "192345678",
            "iban": "BY44 BPSB 3012 5555 5555 5555 5555",
            "bik": "BPSBBY2X",
            "amount": 15600.00,
            "purpose": "Счёт №1205 — канцтовары и расходники",
            "due_date": "11.06.2026",
        },
        {
            "external_id": "1C-BUH-005",
            "doc_kind": "ttn",
            "counterparty": 'ООО "Логистик BY"',
            "unp": "193456789",
            "iban": "BY66 BPSB 3012 6666 6666 6666 6661",
            "bik": "BPSBBY2X",
            "amount": 4800.00,
            "purpose": "ТТН №9012 — доставка груза на склад",
            "due_date": "13.06.2026",
        },
    ],
}

# Дополнительные банковские документы для поиска (per-org)
ORG_EXTRA_BANK_DOCS: dict[str, list[dict]] = {
    "ip_ivanov": [
        {
            "doc_number": "№ 18",
            "doc_date": "15.03.2026",
            "doc_type": "Перевод в BYN",
            "counterparty": "Иванов А.В.",
            "amount": 8500.00,
            "currency": "BYN",
            "status": "Проведен",
            "purpose": "Оплата подрядных работ — март 2026",
        },
        {
            "doc_number": "№ 21",
            "doc_date": "22.03.2026",
            "doc_type": "Перевод в BYN",
            "counterparty": "Иванов А.В.",
            "amount": 12000.00,
            "currency": "BYN",
            "status": "Проведен",
            "purpose": "Аванс по договору оказания услуг",
        },
    ],
    "buh_plus": [
        {
            "doc_number": "№ 480",
            "doc_date": "20.03.2026",
            "doc_type": "Перевод в BYN",
            "counterparty": 'ООО "Поставщик Плюс"',
            "amount": 24500.00,
            "currency": "BYN",
            "status": "Проведен",
            "purpose": "Оплата поставки за март 2026",
        },
        {
            "doc_number": "№ 485",
            "doc_date": "28.03.2026",
            "doc_type": "Счёт на оплату",
            "counterparty": "ФСЗН",
            "amount": 6100.00,
            "currency": "BYN",
            "status": "Проведен",
            "purpose": "Взносы ФСЗН за март 2026",
        },
    ],
}


async def seed_onec():
    async with AsyncSessionLocal() as session:
        for org_id, docs in ORG_ONEC_DOCS.items():
            exists = await session.execute(
                select(OneCDocument).where(OneCDocument.org_id == org_id).limit(1)
            )
            if exists.scalar_one_or_none():
                continue

            conn = await session.get(OneCConnection, org_id)
            if not conn:
                session.add(
                    OneCConnection(
                        org_id=org_id,
                        server_url=f"http://1c-emulator.local/{org_id}",
                        access_token=f"token-{org_id}",
                        is_active=True,
                    )
                )

            for row in docs:
                session.add(OneCDocument(id=str(uuid.uuid4()), org_id=org_id, status="pending", **row))

        for org_id, docs in ORG_EXTRA_BANK_DOCS.items():
            for row in docs:
                dup = await session.execute(
                    select(BankDocument).where(
                        BankDocument.org_id == org_id,
                        BankDocument.doc_number == row["doc_number"],
                    )
                )
                if dup.scalar_one_or_none():
                    continue
                session.add(BankDocument(id=str(uuid.uuid4()), org_id=org_id, **row))

        await session.commit()
