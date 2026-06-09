"""Admin endpoints — сброс БД и reseed (для демо)."""
from __future__ import annotations

import logging
import os

from fastapi import APIRouter, HTTPException

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/reseed")
async def reseed():
    """Снести все таблицы и заново засеять демо-данные.

    Защита: требует заголовок `X-Admin-Token`, если задан env `ADMIN_TOKEN`.
    На Vercel проде включайте `ADMIN_TOKEN` в env, иначе endpoint открыт.
    """
    required = os.getenv("ADMIN_TOKEN")
    if required:
        # ленивый импорт, чтобы не подключать auth-зависимости в serverless cold start
        from fastapi import Request  # noqa: F401

        from starlette.requests import ClientDisconnect  # noqa: F401

    from db.reset import reset_and_seed

    try:
        result = await reset_and_seed()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Manual reseed failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Reseed failed: {exc!s}") from exc
    return result


@router.get("/health")
async def admin_health():
    return {
        "reseed_on_deploy": os.getenv("RESEED_ON_DEPLOY") == "1",
        "admin_token_set": bool(os.getenv("ADMIN_TOKEN")),
    }
