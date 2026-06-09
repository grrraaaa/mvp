"""
Vercel Serverless entry — FastAPI backend on the same deployment as Next.js.

Routes: /api/chat/*, /api/forms/*, /api/auth/*, /health, etc.

Cold start: один раз инициализирует БД (и при RESEED_ON_DEPLOY=1 — сносит
схему и засевает заново). Защищён asyncio.Lock от гонки на первом запросе.
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
_db_state: dict = {"initialized": False, "reseeded": False}


@app.middleware("http")
async def vercel_lazy_db_init(request, call_next):
    """PostgreSQL + tables — init once per warm serverless instance.

    Если задан env `RESEED_ON_DEPLOY=1`, на первом запросе cold-start
    выполняется полный reset схемы и повторный сид демо-данных.
    """
    if not _db_state["initialized"]:
        async with _db_lock:
            if not _db_state["initialized"]:
                try:
                    if (
                        os.getenv("RESEED_ON_DEPLOY") == "1"
                        and not _db_state["reseeded"]
                    ):
                        from db.reset import reset_and_seed

                        logger.info("RESEED_ON_DEPLOY=1 → full schema reset + seed")
                        await reset_and_seed()
                        _db_state["reseeded"] = True
                    else:
                        await init_db()
                    _db_state["initialized"] = True
                except Exception as exc:  # noqa: BLE001
                    logger.exception("DB init failed, will retry on next request: %s", exc)
    return await call_next(request)
