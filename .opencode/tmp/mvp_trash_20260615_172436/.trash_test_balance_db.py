import sys
import asyncio
sys.path.insert(0, r'C:\Users\New\Desktop\sber\mvp\backend')
from db.database import AsyncSessionLocal
from services.banking.queries import get_balance_data

async def main():
    async with AsyncSessionLocal() as session:
        data = await get_balance_data(session, 'demo', history_months=6)
        import json
        print(json.dumps(data, default=str, ensure_ascii=False, indent=2))

asyncio.run(main())
