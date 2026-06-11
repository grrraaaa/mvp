import asyncio
from services.banking.queries import handle_banking_query
from db.database import AsyncSessionLocal

async def go():
    async with AsyncSessionLocal() as s:
        for msg in [
            "найди перевод на 150 рублей",
            "найди платежи Иванова",
            "найди платёж 500 BYN",
        ]:
            r = await handle_banking_query(s, msg, org_id="demo")
            m = r["message"] if r else "(no reply)"
            print(">>> " + msg)
            print("    " + m)
            print()

asyncio.run(go())