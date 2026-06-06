"""Полный пакет демо-данных: выписки, аналитика, заявки — для всех org (Vercel-safe)."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import (
    AnalyticsMonthly,
    BankAccount,
    BankDocument,
    PaymentRequest,
    StatementLine,
)

ORGS = ("demo", "ip_ivanov", "buh_plus")

# Категории расходов по ключевым словам в назначении
CATEGORY_RULES = [
    ("Аренда", ("аренд",)),
    ("Зарплата", ("зарплат", "реестр")),
    ("Налоги", ("налог", "ндс", "фсзн", "минфин", "министерство финансов")),
    ("Поставщики", ("закуп", "постав", "товар", "канц")),
    ("Связь", ("связ", "интернет", "телефон")),
    ("Логистика", ("логист", "доставк")),
    ("Валюта", ("валют", "usd", "eur", "покупка")),
]


def _categorize(purpose: str, doc_type: str) -> str:
    text = f"{purpose} {doc_type}".lower()
    for cat, keys in CATEGORY_RULES:
        if any(k in text for k in keys):
            return cat
    return "Прочее"


def _month_key(doc_date: str) -> str:
    parts = doc_date.split(".")
    if len(parts) == 3:
        y = parts[2] if len(parts[2]) == 4 else f"20{parts[2]}"
        return f"{y}-{parts[1].zfill(2)}"
    return "2026-06"


async def seed_comprehensive():
    async with AsyncSessionLocal() as session:
        for org_id in ORGS:
            exists = await session.execute(
                select(StatementLine).where(StatementLine.org_id == org_id).limit(1)
            )
            if exists.scalar_one_or_none():
                continue

            acc_result = await session.execute(
                select(BankAccount).where(BankAccount.org_id == org_id, BankAccount.hidden == False)
            )
            accounts = acc_result.scalars().all()
            if not accounts:
                continue
            primary = next((a for a in accounts if a.currency == "BYN"), accounts[0])

            doc_result = await session.execute(
                select(BankDocument).where(BankDocument.org_id == org_id)
            )
            docs = doc_result.scalars().all()

            balance = primary.balance
            for doc in sorted(docs, key=lambda d: d.doc_date):
                if doc.status != "Проведен":
                    continue
                debit = doc.amount if doc.currency == primary.currency else 0.0
                balance = max(0.0, balance - debit * 0.1) if debit else balance
                session.add(
                    StatementLine(
                        id=str(uuid.uuid4()),
                        org_id=org_id,
                        account_id=primary.iban,
                        operation_date=doc.doc_date,
                        debit=round(debit, 2),
                        credit=0.0,
                        balance_after=round(balance, 2),
                        counterparty=doc.counterparty,
                        purpose=doc.purpose,
                        doc_ref=doc.doc_number,
                    )
                )

            # Синтетические входящие
            for i, credit in enumerate([450.0, 1200.0, 890.0, 2100.0][: max(2, len(docs) // 3)]):
                d = (datetime.utcnow() - timedelta(days=10 + i * 5)).strftime("%d.%m.%Y")
                balance += credit
                session.add(
                    StatementLine(
                        id=str(uuid.uuid4()),
                        org_id=org_id,
                        account_id=primary.iban,
                        operation_date=d,
                        debit=0.0,
                        credit=credit,
                        balance_after=round(balance, 2),
                        counterparty="ОАО «Сбер Банк»",
                        purpose="Входящий платёж по договору",
                        doc_ref=f"IN-{i + 1}",
                    )
                )

            # Аналитика по проведённым документам
            buckets: dict[tuple[str, str], float] = {}
            for doc in docs:
                if doc.status != "Проведен":
                    continue
                month = _month_key(doc.doc_date)
                cat = _categorize(doc.purpose, doc.doc_type)
                key = (month, cat)
                buckets[key] = buckets.get(key, 0.0) + doc.amount

            for (month, cat), amount in buckets.items():
                session.add(
                    AnalyticsMonthly(
                        id=str(uuid.uuid4()),
                        org_id=org_id,
                        month=month,
                        category=cat,
                        amount=round(amount, 2),
                        currency="BYN",
                    )
                )

            # Демо-заявки
            requests_seed = [
                ("cash_order", {"amount": 5000, "currency": "BYN", "branch": "01-Минск"}),
                ("fx_trade", {"side": "BUY", "currency": "USD", "amount": 1000}),
                ("service", {"service": "softpos", "status": "requested"}),
            ]
            if org_id == "buh_plus":
                requests_seed.append(("certificate", {"kind": "tax_clearance", "period": "2026-Q1"}))
            for rtype, payload in requests_seed:
                session.add(
                    PaymentRequest(
                        id=str(uuid.uuid4()),
                        org_id=org_id,
                        request_type=rtype,
                        status="pending",
                        payload=payload,
                    )
                )

        await session.commit()
