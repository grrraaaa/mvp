import asyncio
import sys
sys.path.insert(0, 'C:/Users/New/Desktop/sber/mvp/backend')

from sqlalchemy.ext.asyncio import AsyncSession
from db.database import AsyncSessionLocal
from services.banking.queries import _list_documents_reply, _parse_doc_period_from_text

async def main():
    print("--- _parse_doc_period_from_text ---")
    msgs = [
        "документы за март 2026",
        "покажи все документы за 2026 год",
        "документы за 2025",
        "документы за период с 01.01.2026 по 31.03.2026",
    ]
    for m in msgs:
        print(f"  {m!r} -> {_parse_doc_period_from_text(m)}")

    print("--- _list_documents_reply ---")
    async with AsyncSessionLocal() as s:
        for m in msgs:
            r = await _list_documents_reply(s, m, "demo")
            print(f"  {m!r} -> msg: {(r or {}).get('message', '')[:120]!r}")
            if r:
                print(f"      ui_actions: {r.get('ui_actions')}")
                print(f"      sources: {r.get('sources')}")

asyncio.run(main())
