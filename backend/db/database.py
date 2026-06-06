from __future__ import annotations

import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from core.db_url import engine_connect_args, resolve_database_url, resolve_init_database_url

DATABASE_URL = resolve_database_url()

_engine_kwargs: dict = {
    "echo": False,
    "pool_pre_ping": True,
    "connect_args": engine_connect_args(),
}
if os.getenv("VERCEL") == "1":
    # Serverless: без долгоживущего пула
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 5

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    from db import models  # noqa: F401 — register models

    init_url = resolve_init_database_url()
    init_engine = (
        create_async_engine(
            init_url,
            poolclass=NullPool,
            connect_args=engine_connect_args(prefer_direct=True),
        )
        if init_url != DATABASE_URL
        else engine
    )
    try:
        async with init_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    finally:
        if init_engine is not engine:
            await init_engine.dispose()

    from db.migrate import run_migrations
    from db.seed import seed_products
    from db.seed_extended import seed_extended
    from db.seed_users import seed_users
    from db.seed_tenants import seed_tenants
    from db.seed_onec import seed_onec
    from db.seed_rich import seed_rich
    from db.seed_comprehensive import seed_comprehensive
    from db.seed_corpo_cards import seed_corpo_cards
    from db.seed_info_requests import seed_info_requests
    from db.seed_statement_accounts import seed_statement_accounts
    from db.seed_statement_recent import seed_statement_recent
    from db.seed_notification_links import seed_notification_links

    await run_migrations()
    await seed_products()
    await seed_users()
    await seed_tenants()
    await seed_extended()
    await seed_onec()
    await seed_rich()
    await seed_comprehensive()
    await seed_corpo_cards()
    await seed_info_requests()
    await seed_statement_accounts()
    await seed_statement_recent()
    await seed_notification_links()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
