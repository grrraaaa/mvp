"""Hard reset БД — снести все таблицы, пересоздать, засеять.

Используется:
- вручную через `POST /api/admin/reseed`;
- автоматически на Vercel cold start, если задан `RESEED_ON_DEPLOY=1`.
"""
from __future__ import annotations

import logging

from sqlalchemy import text

from db.database import Base, engine, init_db

logger = logging.getLogger(__name__)


async def reset_and_seed() -> dict:
    """Дроп всех таблиц + create_all + миграции + сиды. Идемпотентно."""
    async with engine.begin() as conn:
        # CASCADE — зачищаем зависимости между таблицами одним махом
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.run_sync(Base.metadata.create_all)
    logger.info("DB schema reset complete")
    await init_db()
    return {"reset": True, "seeded": True}
