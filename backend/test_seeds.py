"""Найти какой сид вешается."""
import asyncio
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from db.database import engine
from db import models  # noqa: F401
from sqlalchemy import text

SEEDS = [
    ("db.seed", "seed_products"),
    ("db.seed_users", "seed_users"),
    ("db.seed_tenants", "seed_tenants"),
    ("db.seed_extended", "seed_extended"),
    ("db.seed_onec", "seed_onec"),
    ("db.seed_rich", "seed_rich"),
    ("db.seed_comprehensive", "seed_comprehensive"),
    ("db.seed_corpo_cards", "seed_corpo_cards"),
    ("db.seed_info_requests", "seed_info_requests"),
    ("db.seed_statement_accounts", "seed_statement_accounts"),
    ("db.seed_statement_recent", "seed_statement_recent"),
    ("db.seed_notification_links", "seed_notification_links"),
    ("db.seed_features", "seed_features"),
]

async def run():
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT 1"))
        print("DB OK:", r.scalar())

    for mod_name, fn_name in SEEDS:
        try:
            mod = __import__(mod_name, fromlist=[fn_name])
            fn = getattr(mod, fn_name)
            print(f"  Running {mod_name}.{fn_name}...", end=" ", flush=True)
            await asyncio.wait_for(fn(), timeout=15)
            print("OK")
        except asyncio.TimeoutError:
            print("TIMEOUT!")
        except Exception as ex:
            print(f"ERROR: {ex}")

asyncio.run(run())
