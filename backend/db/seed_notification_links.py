"""Привязывает напоминания к реальным данным БД: документ из текста → deep-link на него."""
from __future__ import annotations

import re

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import BankDocument, SmartNotification


async def _find_doc_by_number(session, org_id: str, num: str) -> BankDocument | None:
    result = await session.execute(select(BankDocument).where(BankDocument.org_id == org_id))
    for doc in result.scalars().all():
        if re.sub(r"\D", "", doc.doc_number or "") == num:
            return doc
    return None


async def seed_notification_links():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SmartNotification))
        for n in result.scalars().all():
            body = f"{n.title or ''} {n.body or ''}"
            num_m = re.search(r"№\s*(\d+)", body)
            is_doc = n.category == "document" or re.search(r"подпис", body, re.I)

            if is_doc and num_m:
                doc = await _find_doc_by_number(session, n.org_id, num_m.group(1))
                if doc:
                    n.action_url = f"/other/documents/view?doc={doc.id}"
                    n.action_label = "Открыть"
                    continue
            if is_doc:
                # Подписание происходит на главной (блок «Документы на подписи»)
                if not n.action_url or n.action_url in ("/", "/other/documents/signing"):
                    n.action_url = "/"
                    n.action_label = n.action_label or "Открыть документы"
            elif n.category == "payment" and (not n.action_url or n.action_url == "/"):
                n.action_url = "/payments/paydocbyn"
                n.action_label = n.action_label or "Создать платёж"
            elif n.category == "tax" and (not n.action_url or n.action_url == "/"):
                n.action_url = "/salary/obligations"
                n.action_label = n.action_label or "Обязательства"
        await session.commit()
