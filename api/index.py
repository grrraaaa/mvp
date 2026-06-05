"""
Vercel Serverless entry — FastAPI backend on the same deployment as Next.js.

Routes: /api/chat/*, /api/forms/*, /api/auth/*, /health, etc.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# mvp/ is deployment root; backend package lives alongside frontend
MVP_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = MVP_ROOT / "backend"

sys.path.insert(0, str(BACKEND_DIR))
os.chdir(str(BACKEND_DIR))
os.environ.setdefault("VERCEL", "1")

from db.database import init_db  # noqa: E402
from main import app  # noqa: E402 — FastAPI with /api/* routers

_db_initialized = False


@app.middleware("http")
async def vercel_lazy_db_init(request, call_next):
    """PostgreSQL + tables — init once per warm serverless instance."""
    global _db_initialized
    if not _db_initialized:
        try:
            await init_db()
            _db_initialized = True
        except Exception as exc:
            import logging

            logging.getLogger(__name__).warning("init_db failed, will retry: %s", exc)
    return await call_next(request)
