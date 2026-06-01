from __future__ import annotations

import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.db_url import resolve_database_url

DATABASE_URL = resolve_database_url()

if "sqlite" in DATABASE_URL and "/tmp/" not in DATABASE_URL and ":///" in DATABASE_URL:
    os.makedirs("data", exist_ok=True)

_engine_kwargs: dict = {"echo": False, "pool_pre_ping": True}

if DATABASE_URL.startswith("postgresql"):
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

    from db.seed import seed_products

    await seed_products()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
