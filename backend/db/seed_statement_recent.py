"""Свежие строки выписки на опорную дату демо — по каждому счёту (идемпотентно по doc_ref)."""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select

from core.config import settings
from db.database import AsyncSessionLocal
from db.models import BankAccount, StatementLine

ORGS = ("demo", "ip_ivanov", "buh_plus")

RECENT_SPECS = (
    ("STMT-RECENT-0", 0, 280.0, 0.0),
    ("STMT-RECENT-1", 2, 0.0, 450.0),
    ("STMT-RECENT-2", 5, 120.0, 0.0),
)


def _anchor_date() -> datetime:
    raw = (settings.DEMO_STATEMENT_ANCHOR or "06.06.2026").strip()
    parts = raw.split(".")
    if len(parts) == 3:
        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
        if y < 100:
            y += 2000
        return datetime(y, m, d)
    return datetime(2026, 6, 6)


async def seed_statement_recent():
    anchor = _anchor_date()
    async with AsyncSessionLocal() as session:
        for org_id in ORGS:
            acc_result = await session.execute(
                select(BankAccount).where(BankAccount.org_id == org_id, BankAccount.hidden == False)
            )
            accounts = acc_result.scalars().all()
            for account in accounts:
                suffix = re.sub(r"\D", "", account.iban)[-6:] or "000000"
                balance = account.balance
                for ref_key, days_ago, debit, credit in RECENT_SPECS:
                    doc_ref = f"{ref_key}-{suffix}"
                    exists = await session.execute(
                        select(StatementLine).where(
                            StatementLine.org_id == org_id,
                            StatementLine.doc_ref == doc_ref,
                        )
                    )
                    if exists.scalar_one_or_none():
                        continue
                    op_date = (anchor - timedelta(days=days_ago)).strftime("%d.%m.%Y")
                    if debit:
                        balance = max(0.0, balance - debit)
                    else:
                        balance += credit
                    session.add(
                        StatementLine(
                            id=str(uuid.uuid4()),
                            org_id=org_id,
                            account_id=account.iban,
                            operation_date=op_date,
                            debit=debit,
                            credit=credit,
                            balance_after=round(balance, 2),
                            counterparty="ООО АльфаИнвест" if debit else "ОАО «Сбер Банк»",
                            purpose="Оплата по договору" if debit else "Входящий платёж",
                            doc_ref=doc_ref,
                        )
                    )
        await session.commit()
