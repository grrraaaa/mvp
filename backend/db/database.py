from __future__ import annotations

import asyncio
import os
from functools import wraps

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from core.db_url import engine_connect_args, resolve_database_url, resolve_init_database_url

DATABASE_URL = resolve_database_url()

_engine_kwargs: dict = {
    "echo": False,
    "pool_pre_ping": True,
    "pool_recycle": 1800,  # 30 min — recycle connections to avoid Neon pooler stale sockets
    "connect_args": engine_connect_args(),
}
if os.getenv("VERCEL") == "1":
    # Serverless: без долгоживущего пула
    _engine_kwargs["poolclass"] = NullPool
else:
    # NOTE: previous settings (size=5, overflow=5, timeout=30) caused QueuePool
    # exhaustion under modest concurrency (10 in-flight requests → 504 on the 11th).
    # Bumped to 20/30 with shorter timeout so failures fail fast and connections
    # are released back to the pool quickly.
    _engine_kwargs["pool_size"] = 20
    _engine_kwargs["max_overflow"] = 30
    _engine_kwargs["pool_timeout"] = 10

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# Per-seed timeout (seconds) — prevents one slow/blocked seed from hanging the whole init
_SEED_TIMEOUT = 10


def _timed(coro):
    """Wrap an async coroutine with asyncio.wait_for; log warning on timeout."""

    @wraps(coro)
    async def wrapper(*args, **kwargs):
        name = coro.__name__

        @wraps(coro)
        async def _run():
            return await coro(*args, **kwargs)

        try:
            return await asyncio.wait_for(_run(), timeout=_SEED_TIMEOUT)
        except asyncio.TimeoutError:
            print(f"[init_db] WARNING: {name} timed out after {_SEED_TIMEOUT}s — skipping")
            return None

    return wrapper


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
    from db.seed_features import seed_features
    from db.seed_dynamic_cleanup import cleanup_dynamic_notifications

    # Migrations: no timeout — should always succeed
    await run_migrations()

    # Удаляем старые хардкод-уведомления с динамическими заголовками
    # (теперь генерируются на лету из BankDocument + cash_gap_forecast).
    await _timed(cleanup_dynamic_notifications)()

    # Seeds: each has its own timeout so one slow/blocked seed doesn't hang the rest
    await _timed(seed_products)()
    await _timed(seed_users)()
    await _timed(seed_tenants)()
    await _timed(seed_extended)()
    await _timed(seed_onec)()
    await _timed(seed_rich)()
    await _timed(seed_comprehensive)()
    await _timed(seed_corpo_cards)()
    await _timed(seed_info_requests)()
    await _timed(seed_statement_accounts)()
    await _timed(seed_statement_recent)()
    await _timed(seed_notification_links)()
    await _timed(seed_features)()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
