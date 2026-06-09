import asyncio
import sys
sys.path.insert(0, r"C:\Users\New\Desktop\sber\mvp\backend")

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from core.db_url import resolve_database_url, engine_connect_args

async def test():
    url = resolve_database_url()
    args = engine_connect_args()
    print("URL:", url)
    print("Args:", args)
    e = create_async_engine(url, connect_args=args, echo=False)
    async with e.connect() as conn:
        r = await conn.execute(text("SELECT 1"))
        print("Neon OK:", r.scalar())
    await e.dispose()

asyncio.run(test())
