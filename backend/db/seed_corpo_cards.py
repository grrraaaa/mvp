"""Документы «Переводы на корпоративные карты» (PAY_DOC_CORPO_CARD) по организациям."""
from __future__ import annotations

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import BankDocument

DOC_TYPE = "PAY_DOC_CORPO_CARD"
PURPOSE = "Пополнение карточного счета"
CARD_IBAN = "BY83 BPSB 3012 8888 8888 0933 0000"

# На подписи — как в SBBOL (вкладка «На подпись»)
TO_SIGN = [
    ("51", "04.03.2026", 20.00),
    ("50", "04.03.2026", 5000.00),
    ("26", "29.01.2026", 55.00),
    ("199", "13.11.2025", 324.00),
    ("197", "09.11.2025", 25.00),
    ("176", "26.09.2025", 150.00),
    ("165", "09.09.2025", 1_000_000_000_000.00),
    ("162", "04.09.2025", 10000.00),
    ("144", "01.08.2025", 100_000_000.00),
    ("94", "19.05.2025", 300.00),
    ("73", "25.04.2025", 10.00),
    ("54", "03.04.2025", 100.00),
    ("24", "21.02.2025", 1000.00),
    ("20", "13.02.2025", 251.00),
    ("4004", "03.01.2024", 5.00),
    ("290", "24.10.2023", 20.00),
    ("49", "28.02.2026", 75.00),
    ("48", "27.02.2026", 120.00),
    ("47", "25.02.2026", 33.00),
    ("46", "20.02.2026", 88.00),
    ("45", "18.02.2026", 200.00),
    ("44", "15.02.2026", 15.00),
    ("43", "10.02.2026", 500.00),
    ("42", "05.02.2026", 42.00),
    ("41", "01.02.2026", 99.00),
    ("40", "28.01.2026", 10.00),
    ("39", "20.01.2026", 250.00),
    ("38", "15.01.2026", 180.00),
]

# Черновики — выборка из SBBOL
DRAFTS = [
    ("92", "05.06.2026", 0.00, ""),
    ("91", "04.06.2026", 100.00, CARD_IBAN),
    ("90", "03.06.2026", 0.00, CARD_IBAN),
    ("89", "01.06.2026", 0.00, ""),
    ("88", "22.05.2026", 0.00, CARD_IBAN),
    ("87", "22.05.2026", 0.00, CARD_IBAN),
    ("86", "19.05.2026", 0.00, ""),
    ("85", "14.05.2026", 0.00, ""),
    ("84", "13.05.2026", 0.00, CARD_IBAN),
    ("83", "08.05.2026", 0.00, CARD_IBAN),
    ("82", "06.05.2026", 0.00, CARD_IBAN),
    ("81", "05.05.2026", 0.00, CARD_IBAN),
    ("80", "05.05.2026", 0.00, CARD_IBAN),
    ("79", "30.04.2026", 0.00, CARD_IBAN),
    ("78", "23.04.2026", 0.00, CARD_IBAN),
    ("77", "23.04.2026", 0.00, CARD_IBAN),
    ("76", "16.04.2026", 1000.00, CARD_IBAN),
    ("75", "16.04.2026", 0.00, CARD_IBAN),
    ("74", "16.04.2026", 0.00, CARD_IBAN),
    ("73d", "16.04.2026", 0.00, CARD_IBAN),
    ("72", "16.04.2026", 0.00, ""),
    ("71", "16.04.2026", 0.00, CARD_IBAN),
    ("70", "15.04.2026", 100.00, CARD_IBAN),
    ("69", "15.04.2026", 100.00, CARD_IBAN),
    ("67", "15.04.2026", 0.00, CARD_IBAN),
    ("66", "15.04.2026", 0.00, CARD_IBAN),
    ("65", "13.04.2026", 0.00, ""),
    ("64", "13.04.2026", 0.00, CARD_IBAN),
    ("63", "03.04.2026", 9.00, CARD_IBAN),
    ("62", "03.04.2026", 0.00, CARD_IBAN),
    ("60", "01.04.2026", 100.00, CARD_IBAN),
    ("59", "27.03.2026", 100.00, CARD_IBAN),
    ("58", "27.03.2026", 0.00, CARD_IBAN),
    ("57", "26.03.2026", 100.00, CARD_IBAN),
    ("56", "26.03.2026", 100.00, CARD_IBAN),
    ("55", "17.03.2026", 5000.00, CARD_IBAN),
    ("54d", "16.03.2026", 200.00, CARD_IBAN),
    ("53", "10.03.2026", 0.00, CARD_IBAN),
    ("52", "06.03.2026", 566.66, CARD_IBAN),
]

ORGS = ("demo", "ip_ivanov", "buh_plus")


async def seed_corpo_cards():
    async with AsyncSessionLocal() as session:
        for org_id in ORGS:
            existing = await session.execute(
                select(BankDocument).where(
                    BankDocument.org_id == org_id,
                    BankDocument.doc_type == DOC_TYPE,
                )
            )
            if existing.scalars().first():
                continue

            for num, date, amount in TO_SIGN:
                session.add(
                    BankDocument(
                        id=f"corpo-{org_id}-sign-{num}",
                        org_id=org_id,
                        doc_number=f"№{num}",
                        doc_date=date,
                        doc_type=DOC_TYPE,
                        counterparty=CARD_IBAN,
                        amount=amount,
                        currency="BYN",
                        status="На подписи",
                        purpose=PURPOSE,
                    )
                )

            for num, date, amount, account in DRAFTS:
                session.add(
                    BankDocument(
                        id=f"corpo-{org_id}-draft-{num}",
                        org_id=org_id,
                        doc_number=f"№{num.replace('d', '')}" if "d" in num else f"№{num}",
                        doc_date=date,
                        doc_type=DOC_TYPE,
                        counterparty=account,
                        amount=amount,
                        currency="BYN",
                        status="Черновик",
                        purpose=PURPOSE,
                    )
                )

        await session.commit()
