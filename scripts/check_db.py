"""Quick DB introspection."""
import asyncio
import sys
from pathlib import Path

BACKEND = Path(r"C:\Users\New\Desktop\sber\mvp\backend")
sys.path.insert(0, str(BACKEND))


async def main():
    from db.database import AsyncSessionLocal
    from db.models import BankDocument
    from sqlalchemy import select, func

    async with AsyncSessionLocal() as session:
        total_info = await session.execute(
            select(func.count(BankDocument.id))
            .where(BankDocument.doc_type.like("INFO:%"))
        )
        print(f"INFO: docs total = {total_info.scalar()}")

        rows = await session.execute(
            select(BankDocument.org_id, func.count(BankDocument.id))
            .where(BankDocument.doc_type.like("INFO:%"))
            .group_by(BankDocument.org_id)
        )
        for org_id, n in rows.all():
            print(f"  {org_id}: {n}")

        # Документы № 211 (в БД формат «№211» без пробела — seed_info_requests.py
        # делает f"№{num}"). Проверяем оба варианта для совместимости.
        for org_id in ("demo", "ip_ivanov", "buh_plus"):
            row = await session.execute(
                select(BankDocument).where(
                    BankDocument.org_id == org_id,
                    BankDocument.doc_number.in_(["№211", "№ 211"]),
                )
            )
            doc = row.scalar_one_or_none()
            if doc:
                print()
                print(f"FOUND doc №211 in org={org_id}:")
                print(f"  id: {doc.id}")
                print(f"  number: {doc.doc_number}")
                print(f"  type: {doc.doc_type}")
                print(f"  date: {doc.doc_date}")
                print(f"  status: {doc.status}")
                print(f"  purpose: {doc.purpose}")


asyncio.run(main())
