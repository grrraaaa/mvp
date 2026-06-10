"""
Vercel Serverless entry — FastAPI backend on the same deployment as Next.js.

Routes: /api/chat/*, /api/forms/*, /api/auth/*, /health, etc.

БД и деплой:
- На каждый НОВЫЙ деплой Vercel схема БД полностью сносится и засевается заново
  (отслеживается по VERCEL_DEPLOYMENT_ID/SHA в таблице deploy_meta).
- RESEED_ON_DEPLOY=1 — более агрессивный режим: reset+seed на каждом cold start.
- Защищено asyncio.Lock (внутри инстанса) и pg_advisory_lock (между инстансами).
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path

# mvp/ is deployment root; backend package lives alongside frontend
MVP_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = MVP_ROOT / "backend"

sys.path.insert(0, str(BACKEND_DIR))
os.chdir(str(BACKEND_DIR))
os.environ.setdefault("VERCEL", "1")

logger = logging.getLogger("vercel_entry")
logging.basicConfig(level=logging.INFO)

from db.database import init_db  # noqa: E402
from main import app  # noqa: E402 — FastAPI with /api/* routers

_db_lock = asyncio.Lock()
_db_state: dict = {"initialized": False, "reseed_checked": False}

_DEPLOY_LOCK_KEY = 774401  # advisory-lock id для координации reseed между инстансами


def _current_deploy_id() -> str:
    return (
        os.getenv("VERCEL_DEPLOYMENT_ID")
        or os.getenv("VERCEL_GIT_COMMIT_SHA")
        or ""
    )


async def _reseed_once_per_deploy() -> bool:
    """Полный reset+seed, если этот деплой ещё не сеялся. Возвращает True если пересеяли.

    Координация между serverless-инстансами — через pg_advisory_lock и таблицу
    deploy_meta (переживает reset, т.к. вставляется заново после сидов).
    """
    deploy_id = _current_deploy_id()
    if not deploy_id:
        return False

    from sqlalchemy import text

    from db.database import engine

    if engine.dialect.name != "postgresql":
        return False

    async with engine.connect() as conn:
        await conn.execute(text("SELECT pg_advisory_lock(:k)"), {"k": _DEPLOY_LOCK_KEY})
        try:
            await conn.execute(
                text("CREATE TABLE IF NOT EXISTS deploy_meta (key TEXT PRIMARY KEY, value TEXT)")
            )
            await conn.commit()
            row = (
                await conn.execute(
                    text("SELECT value FROM deploy_meta WHERE key = 'deployment_id'")
                )
            ).first()
            if row is not None and row[0] == deploy_id:
                return False  # этот деплой уже засеян другим инстансом

            from db.reset import reset_and_seed

            logger.info("New deployment %s → full schema reset + seed", deploy_id)
            await reset_and_seed()

            # reset снёс схему вместе с deploy_meta — создаём заново и фиксируем деплой
            await conn.execute(
                text("CREATE TABLE IF NOT EXISTS deploy_meta (key TEXT PRIMARY KEY, value TEXT)")
            )
            await conn.execute(
                text(
                    "INSERT INTO deploy_meta (key, value) VALUES ('deployment_id', :v) "
                    "ON CONFLICT (key) DO UPDATE SET value = :v"
                ),
                {"v": deploy_id},
            )
            await conn.commit()
            return True
        finally:
            await conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": _DEPLOY_LOCK_KEY})
            await conn.commit()


@app.middleware("http")
async def vercel_lazy_db_init(request, call_next):
    """PostgreSQL + tables — init once per warm serverless instance.

    Каждый новый деплой полностью пересевается (см. _reseed_once_per_deploy).
    RESEED_ON_DEPLOY=1 дополнительно форсирует reset на каждом cold start.
    """
    if not _db_state["initialized"]:
        async with _db_lock:
            if not _db_state["initialized"]:
                try:
                    reseeded = False
                    if not _db_state["reseed_checked"]:
                        if os.getenv("RESEED_ON_DEPLOY") == "1":
                            from db.reset import reset_and_seed

                            logger.info("RESEED_ON_DEPLOY=1 → full schema reset + seed")
                            await reset_and_seed()
                            reseeded = True
                        else:
                            reseeded = await _reseed_once_per_deploy()
                        _db_state["reseed_checked"] = True
                    if not reseeded:
                        await init_db()
                    _db_state["initialized"] = True
                except Exception as exc:  # noqa: BLE001
                    logger.exception("DB init failed, will retry on next request: %s", exc)
    return await call_next(request)
