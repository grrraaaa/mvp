"""Дополняет выписки по всем счетам организации (идемпотентно по account_id)."""
from __future__ import annotations

import uuid
from datetime import timedelta

from sqlalchemy import select

from core.config import settings
from db.database import AsyncSessionLocal
from db.models import BankAccount, BankDocument, StatementLine

ORGS = ("demo", "ip_ivanov", "buh_plus")


def _anchor_date():
    from datetime import datetime

    raw = (settings.DEMO_STATEMENT_ANCHOR or "06.06.2026").strip()
    parts = raw.split(".")
    if len(parts) == 3:
        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
        if y < 100:
            y += 2000
        return datetime(y, m, d)
    return datetime(2026, 6, 6)


async def seed_statement_accounts():
    anchor = _anchor_date()
    async with AsyncSessionLocal() as session:
        for org_id in ORGS:
            acc_result = await session.execute(
                select(BankAccount).where(BankAccount.org_id == org_id, BankAccount.hidden == False)
            )
            accounts = acc_result.scalars().all()
            if not accounts:
                continue

            doc_result = await session.execute(
                select(BankDocument).where(BankDocument.org_id == org_id)
            )
            docs = list(doc_result.scalars().all())

            for account in accounts:
                exists = await session.execute(
                    select(StatementLine)
                    .where(
                        StatementLine.org_id == org_id,
                        StatementLine.account_id == account.iban,
                    )
                    .limit(1)
                )
                if exists.scalar_one_or_none():
                    continue

                balance = account.balance
                cur_docs = [d for d in docs if d.currency == account.currency]
                if not cur_docs and account.currency != "BYN":
                    cur_docs = docs[:2]

                for i, doc in enumerate(sorted(cur_docs, key=lambda d: d.doc_date)):
                    if doc.status != "Проведен":
                        continue
                    debit = doc.amount if doc.currency == account.currency else round(doc.amount * 0.15, 2)
                    balance = max(0.0, balance - debit * 0.08)
                    session.add(
                        StatementLine(
                            id=str(uuid.uuid4()),
                            org_id=org_id,
                            account_id=account.iban,
                            operation_date=doc.doc_date,
                            debit=round(debit, 2),
                            credit=0.0,
                            balance_after=round(balance, 2),
                            counterparty=doc.counterparty,
                            purpose=doc.purpose,
                            doc_ref=doc.doc_number,
                        )
                    )

                credits = [320.0, 890.0, 1500.0] if account.currency == "BYN" else [120.0, 450.0]
                for i, credit in enumerate(credits[: max(2, len(cur_docs) // 2 + 1)]):
                    d = (anchor - timedelta(days=8 + i * 4)).strftime("%d.%m.%Y")
                    balance += credit
                    session.add(
                        StatementLine(
                            id=str(uuid.uuid4()),
                            org_id=org_id,
                            account_id=account.iban,
                            operation_date=d,
                            debit=0.0,
                            credit=credit,
                            balance_after=round(balance, 2),
                            counterparty="ОАО «Сбер Банк»",
                            purpose=f"Поступление на счёт {account.label or account.iban[-4:]}",
                            doc_ref=f"IN-{account.iban[-4:]}-{i + 1}",
                        )
                    )

        await session.commit()
