"""Обработка запросов ассистента про 1С."""
from __future__ import annotations

import re

from sqlalchemy.ext.asyncio import AsyncSession

from models.schemas import ActionButton, AssistantResponse, SourceRef
from services.onec.connector import DOC_KIND_LABELS, format_onec_doc_line, list_onec_documents, sync_from_1c

_ONEC_PATTERNS = [
    r"1\s*с",
    r"1c",
    r"onec",
    r"один\s*с",
    r"синхрониз",
    r"выгруз\w*\s+из",
    r"импорт\w*\s+из",
    r"документ\w*\s+к\s+оплат",
    r"реестр\s+документ",
]


def is_onec_query(message: str) -> bool:
    msg = message.lower()
    return any(re.search(p, msg) for p in _ONEC_PATTERNS)


async def handle_onec_query(
    db: AsyncSession,
    message: str,
    session_id: str,
    org_id: str,
) -> AssistantResponse | None:
    if not is_onec_query(message):
        return None

    msg = message.lower()
    if re.search(r"синхрониз|выгруз|обнов", msg):
        docs = await sync_from_1c(db, org_id)
        if not docs:
            return AssistantResponse(
                message="Синхронизация с 1С завершена. Новых документов к оплате нет.",
                session_id=session_id,
                action_buttons=[
                    ActionButton(label="Открыть коннектор 1С", url="/services", variant="primary"),
                ],
            )
        lines = [format_onec_doc_line(d) for d in docs[:8]]
        return AssistantResponse(
            message=(
                f"Из 1С получено **{len(docs)}** документ(ов) к оплате:\n\n"
                + "\n".join(lines)
                + "\n\nИмпортируйте в банк — платёжки сформируются автоматически."
            ),
            session_id=session_id,
            sources=[
                SourceRef(index=1, label="Коннектор 1С (PostgreSQL)", kind="service", url="/services"),
            ],
            action_buttons=[
                ActionButton(label="Импортировать все", url="/services", variant="primary"),
                ActionButton(label="Показать на подписи", url="/", variant="secondary"),
            ],
        )

    docs = await list_onec_documents(db, org_id, status="pending")
    if not docs:
        imported = await list_onec_documents(db, org_id, status="imported")
        return AssistantResponse(
            message=(
                "Все документы из 1С уже импортированы в банк."
                + (f" Импортировано: {len(imported)}." if imported else "")
            ),
            session_id=session_id,
            action_buttons=[
                ActionButton(label="Синхронизировать с 1С", message="Синхронизировать с 1С"),
            ],
        )

    lines = []
    for i, d in enumerate(docs[:6], 1):
        kind = DOC_KIND_LABELS.get(d.doc_kind, d.doc_kind)
        lines.append(f"{i}. **{kind}** — {d.counterparty}, {d.amount:.2f} {d.currency}")

    return AssistantResponse(
        message="Документы из 1С, ожидающие импорта:\n\n" + "\n".join(lines),
        session_id=session_id,
        sources=[SourceRef(index=1, label="Реестр 1С", kind="onec", url="/services")],
        action_buttons=[
            ActionButton(label="Импортировать пакетом", url="/services", variant="primary"),
            ActionButton(label="Синхронизировать", message="Синхронизировать с 1С", variant="secondary"),
        ],
    )
