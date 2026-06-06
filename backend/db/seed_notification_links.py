"""Обновляет ссылки напоминаний на реальные разделы демо."""
from __future__ import annotations

import re

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import SmartNotification

_DOC_SIGNING = "/other/documents/signing"


async def seed_notification_links():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SmartNotification))
        for n in result.scalars().all():
            body = n.body or ""
            is_signing = bool(
                re.search(r"подпис", body, re.I)
                or re.search(r"№\s*\d+", body)
                and n.category == "document"
            )
            if n.category == "document" or is_signing:
                if not n.action_url or n.action_url == "/":
                    n.action_url = _DOC_SIGNING
                    n.action_label = n.action_label or "Открыть на подпись"
            elif n.category == "payment" and (not n.action_url or n.action_url == "/"):
                n.action_url = "/payments/paydocbyn"
                n.action_label = n.action_label or "Создать платёж"
            elif n.category == "tax" and (not n.action_url or n.action_url == "/"):
                n.action_url = "/salary/obligations"
                n.action_label = n.action_label or "Обязательства"
        await session.commit()
