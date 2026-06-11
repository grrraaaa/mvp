import asyncio
from services.banking.search import smart_search, _parse_amount, _parse_currency, _parse_doc_number
from db.database import AsyncSessionLocal


async def go():
    async with AsyncSessionLocal() as s:
        for msg in ["найди платёж 500 BYN", "найди перевод 150 рублей"]:
            print(f">>> {msg}")
            print(f"    amount = {_parse_amount(msg)}")
            print(f"    currency = {_parse_currency(msg)}")
            print(f"    doc_number = {_parse_doc_number(msg)}")
            hits = await smart_search(s, msg, limit=10)
            for h in hits:
                print(f"    hit: {h.kind} | {h.title} | {h.amount} {h.currency} | {h.status}")
            print()


asyncio.run(go())
