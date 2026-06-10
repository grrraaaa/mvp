"""Удаление уведомлений с динамическими заголовками из БД.

Эти категории теперь генерируются на лету из реальных данных
(BankDocument, cash_gap_forecast) в services.banking.dynamic_notifications.
Хардкод-уведомления с теми же заголовками больше не нужны.
"""
from __future__ import annotations

from sqlalchemy import delete

from db.database import AsyncSessionLocal
from db.models import SmartNotification
from services.banking.dynamic_notifications import DYNAMIC_TITLES


async def cleanup_dynamic_notifications():
    """Идемпотентно удаляет строки smart_notifications с динамическими заголовками."""
    async with AsyncSessionLocal() as session:
        await session.execute(
            delete(SmartNotification).where(SmartNotification.title.in_(DYNAMIC_TITLES))
        )
        await session.commit()
