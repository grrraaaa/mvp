from __future__ import annotations

import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.db_url import resolve_database_url

DATABASE_URL = resolve_database_url()

_engine_kwargs: dict = {"echo": False, "pool_pre_ping": True}
_engine_kwargs["pool_size"] = 1 if os.getenv("VERCEL") == "1" else 5
_engine_kwargs["max_overflow"] = 0 if os.getenv("VERCEL") == "1" else 5

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    from db import models  # noqa: F401 — register models

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from db.migrate import run_migrations
    from db.seed import seed_products
    from db.seed_extended import seed_extended
    from db.seed_users import seed_users
    from db.seed_tenants import seed_tenants
    from db.seed_onec import seed_onec
    from db.seed_rich import seed_rich

    await run_migrations()
    await seed_products()
    await seed_users()
    await seed_tenants()
    await seed_extended()
    await seed_onec()
    await seed_rich()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
