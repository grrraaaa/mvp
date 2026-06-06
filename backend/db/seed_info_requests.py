"""Запросы выписки и информации по счетам (Прочее → INFO:*)."""
from __future__ import annotations

import random
from datetime import datetime, timedelta

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import BankDocument

INFO_PREFIX = "INFO:"

KINDS = [
    "Выписка по счету (исполненные документы)",
    "Остаток по счету (предварительная информация)",
    "Сведения о зачислении/списании в инвалюте",
    "Ведомость неисполненных денежных обязательств в АИС ИДО",
    "Сведения о забронированных средствах",
]

ACCOUNTS = [
    "",
    "BY51 BPSB 3012 2222 2222 2933 2222",
    "BY41 BPSB 3012 0000 0000 0978 0000",
]

# (номер, дата, вид, счёт, строка периода)
DRAFTS = [
    ("212", "05.06.2026", KINDS[0], "", "Период:"),
    ("211", "05.06.2026", KINDS[1], "", "По состоянию на текущий момент"),
    ("210", "04.06.2026", KINDS[2], ACCOUNTS[1], "Период:"),
    ("209", "03.06.2026", KINDS[1], ACCOUNTS[1], "По состоянию на текущий момент"),
    ("208", "03.06.2026", KINDS[1], "", "По состоянию на текущий момент"),
    ("207", "02.06.2026", KINDS[1], "", "По состоянию на текущий момент"),
    ("206", "02.06.2026", KINDS[1], ACCOUNTS[2], "По состоянию на текущий момент"),
    ("205", "02.06.2026", KINDS[1], "", "По состоянию на текущий момент"),
    ("204", "02.06.2026", KINDS[2], "", "Период:"),
    ("203", "02.06.2026", KINDS[3], ACCOUNTS[1], "По состоянию на текущий момент"),
    ("202", "29.05.2026", KINDS[1], "", "По состоянию на текущий момент"),
    ("201", "29.05.2026", KINDS[4], ACCOUNTS[1], "По состоянию на текущий момент"),
    ("200", "27.05.2026", KINDS[1], "", "По состоянию на текущий момент"),
    ("199", "26.05.2026", KINDS[3], "", "По состоянию на текущий момент"),
    ("198", "25.05.2026", KINDS[1], "", "По состоянию на текущий момент"),
    ("197", "25.05.2026", KINDS[1], "", "По состоянию на текущий момент"),
    ("196", "25.05.2026", KINDS[4], "", "По состоянию на текущий момент"),
    ("195", "22.05.2026", KINDS[3], ACCOUNTS[1], "По состоянию на текущий момент"),
    ("194", "22.05.2026", KINDS[4], "", "По состоянию на текущий момент"),
    ("193", "22.05.2026", KINDS[4], "", "По состоянию на текущий момент"),
]

TO_SIGN = [
    ("180", "15.05.2026", KINDS[0], ACCOUNTS[1], "Период: 01.05.2026 — 15.05.2026"),
    ("179", "14.05.2026", KINDS[1], ACCOUNTS[2], "По состоянию на текущий момент"),
    ("178", "10.05.2026", KINDS[2], ACCOUNTS[1], "Период: апрель 2026"),
    ("177", "08.05.2026", KINDS[4], "", "По состоянию на текущий момент"),
    ("176", "05.05.2026", KINDS[3], ACCOUNTS[1], "По состоянию на текущий момент"),
    ("175", "01.05.2026", KINDS[0], "", "Период: I квартал 2026"),
    ("174", "28.04.2026", KINDS[1], ACCOUNTS[1], "По состоянию на текущий момент"),
    ("173", "25.04.2026", KINDS[2], "", "Период:"),
    ("172", "20.04.2026", KINDS[1], ACCOUNTS[2], "По состоянию на текущий момент"),
    ("171", "15.04.2026", KINDS[4], ACCOUNTS[1], "По состоянию на текущий момент"),
    ("170", "10.04.2026", KINDS[0], ACCOUNTS[1], "Период: март 2026"),
    ("169", "05.04.2026", KINDS[3], "", "По состоянию на текущий момент"),
]

DELETED = [
    ("12", "01.03.2026", KINDS[1], "", "По состоянию на текущий момент"),
    ("11", "28.02.2026", KINDS[0], ACCOUNTS[1], "Период:"),
    ("10", "20.02.2026", KINDS[2], "", "Период:"),
]

ORGS = ("demo", "ip_ivanov", "buh_plus")

# Дополнительные черновики для объёма списка (без перегруза init_db)
BULK_DRAFT_COUNT = 45


def _add_row(
    session,
    *,
    org_id: str,
    row_id: str,
    num: str,
    date: str,
    kind: str,
    account: str,
    period_line: str,
    status: str,
) -> None:
    session.add(
        BankDocument(
            id=row_id,
            org_id=org_id,
            doc_number=f"№{num}",
            doc_date=date,
            doc_type=f"{INFO_PREFIX}{kind}",
            counterparty=account,
            amount=0.0,
            currency="BYN",
            status=status,
            purpose=period_line,
        )
    )


async def seed_info_requests():
    async with AsyncSessionLocal() as session:
        for org_id in ORGS:
            existing = await session.execute(
                select(BankDocument).where(
                    BankDocument.org_id == org_id,
                    BankDocument.doc_type.like(f"{INFO_PREFIX}%"),
                ).limit(1)
            )
            if existing.scalar_one_or_none():
                continue

            for num, date, kind, account, period in DRAFTS:
                _add_row(
                    session,
                    org_id=org_id,
                    row_id=f"info-{org_id}-draft-{num}",
                    num=num,
                    date=date,
                    kind=kind,
                    account=account,
                    period_line=period,
                    status="Черновик",
                )

            for num, date, kind, account, period in TO_SIGN:
                _add_row(
                    session,
                    org_id=org_id,
                    row_id=f"info-{org_id}-sign-{num}",
                    num=num,
                    date=date,
                    kind=kind,
                    account=account,
                    period_line=period,
                    status="На подписи",
                )

            for num, date, kind, account, period in DELETED:
                _add_row(
                    session,
                    org_id=org_id,
                    row_id=f"info-{org_id}-del-{num}",
                    num=num,
                    date=date,
                    kind=kind,
                    account=account,
                    period_line=period,
                    status="Удален",
                )

            base = datetime(2026, 5, 1)
            rng = random.Random(42 + hash(org_id) % 1000)
            for i in range(BULK_DRAFT_COUNT):
                num = str(192 - i)
                dt = (base - timedelta(days=i * 2)).strftime("%d.%m.%Y")
                kind = KINDS[i % len(KINDS)]
                account = ACCOUNTS[i % len(ACCOUNTS)]
                period = "Период:" if i % 3 == 0 else "По состоянию на текущий момент"
                _add_row(
                    session,
                    org_id=org_id,
                    row_id=f"info-{org_id}-bulk-{num}",
                    num=num,
                    date=dt,
                    kind=kind,
                    account=account,
                    period_line=period,
                    status="Черновик",
                )

        await session.commit()
