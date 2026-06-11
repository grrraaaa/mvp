"""Обработка запросов ассистента про 1С."""
from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankDocument
from models.schemas import ActionButton, AssistantResponse, SourceRef, UiAction
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
                    ActionButton(label="Все документы", url="/other/documents", variant="secondary"),
                ],
                ui_actions=[UiAction(type="navigate", target="/other/documents")],
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
                SourceRef(index=1, label="Коннектор 1С", kind="service", url="/services"),
            ],
            action_buttons=[
                ActionButton(label="Импортировать все", url="/services", variant="primary"),
                ActionButton(label="Все документы", url="/other/documents", variant="secondary"),
            ],
        )

    # «Покажи данные из 1С» / «документы из 1С» / «реестр 1С» — без явного
    # глагола синхронизации. Показываем pending-документы и ведём в общий
    # журнал документов организации, чтобы пользователь видел ВСЕ документы
    # (включая те, что уже импортированы и проведены).
    pending = await list_onec_documents(db, org_id, status="pending")
    imported = await list_onec_documents(db, org_id, status="imported")
    docs_count = (await db.execute(
        select(BankDocument).where(BankDocument.org_id == org_id)
    )).scalars().all()
    total_in_bank = len(docs_count)

    if not pending and not imported:
        # Ничего не приходило из 1С — просто откроем общий журнал
        return AssistantResponse(
            message=(
                "Из 1С пока не поступало документов.\n\n"
                "Откройте коннектор и подключите вашу базу 1С — документы к оплате "
                "появятся здесь автоматически."
            ),
            session_id=session_id,
            action_buttons=[
                ActionButton(label="Все документы", url="/other/documents", variant="primary"),
                ActionButton(label="Синхронизировать с 1С", message="Синхронизировать с 1С", variant="secondary"),
            ],
            ui_actions=[UiAction(type="navigate", target="/other/documents")],
        )

    if not pending:
        # Все уже импортированы — отдаём сводку и переходим к журналу
        return AssistantResponse(
            message=(
                f"Из 1С импортировано **{len(imported)}** документов, новых нет.\n\n"
                f"Всего в банке по организации: {total_in_bank} документов. "
                "Открываю журнал, чтобы были видны и платежи из 1С, и обычные."
            ),
            session_id=session_id,
            sources=[SourceRef(index=1, label="Реестр 1С", kind="onec", url="/services/onec")],
            action_buttons=[
                ActionButton(label="Все документы", url="/other/documents", variant="primary"),
                ActionButton(label="Синхронизировать с 1С", message="Синхронизировать с 1С", variant="secondary"),
            ],
            ui_actions=[UiAction(type="navigate", target="/other/documents")],
        )

    # Есть pending — показываем их + переход ко всем документам
    lines = []
    for i, d in enumerate(pending[:6], 1):
        kind = DOC_KIND_LABELS.get(d.doc_kind, d.doc_kind)
        lines.append(f"{i}. **{kind}** — {d.counterparty}, {d.amount:.2f} {d.currency}")
    extra = ""
    if imported:
        extra = f"\n\nУже импортировано ранее: **{len(imported)}** документов."
    if total_in_bank:
        extra += f"\nВсего в банке: **{total_in_bank}** документов."

    return AssistantResponse(
        message=(
            f"Документы из 1С, ожидающие импорта ({len(pending)}):\n\n"
            + "\n".join(lines)
            + extra
        ),
        session_id=session_id,
        sources=[
            SourceRef(index=1, label="Реестр 1С", kind="onec", url="/services/onec"),
            SourceRef(index=2, label="Журнал документов банка", kind="documents", url="/other/documents"),
        ],
        action_buttons=[
            ActionButton(label="Все документы", url="/other/documents", variant="primary"),
            ActionButton(label="Импортировать пакетом", url="/services", variant="secondary"),
            ActionButton(label="Синхронизировать", message="Синхронизировать с 1С", variant="secondary"),
        ],
        ui_actions=[UiAction(type="navigate", target="/other/documents")],
    )
