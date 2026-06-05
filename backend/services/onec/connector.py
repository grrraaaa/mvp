"""Эмулятор коннектора 1С — все данные в PostgreSQL, без реального 1С."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankDocument, OneCConnection, OneCDocument

DOC_KIND_LABELS = {
    "payment_request": "Платёжное требование",
    "tax": "Налоговое обязательство",
    "ttn": "ТТН / накладная",
    "payroll": "Зарплатная ведомость",
    "contract": "Договор (график платежей)",
}


async def get_or_create_connection(db: AsyncSession, org_id: str) -> OneCConnection:
    conn = await db.get(OneCConnection, org_id)
    if conn:
        return conn
    conn = OneCConnection(
        org_id=org_id,
        server_url=f"http://1c-emulator.local/{org_id}",
        access_token=f"token-{org_id}",
        is_active=True,
    )
    db.add(conn)
    await db.flush()
    return conn


async def connect_1c(
    db: AsyncSession,
    org_id: str,
    server_url: str = "",
    access_token: str = "",
) -> OneCConnection:
    conn = await get_or_create_connection(db, org_id)
    if server_url:
        conn.server_url = server_url
    if access_token:
        conn.access_token = access_token
    conn.is_active = True
    await db.commit()
    await db.refresh(conn)
    return conn


async def sync_from_1c(db: AsyncSession, org_id: str) -> list[OneCDocument]:
    """«Синхронизация» — читает pending-документы из PostgreSQL (эмуляция выгрузки из 1С)."""
    conn = await get_or_create_connection(db, org_id)
    conn.last_sync_at = datetime.utcnow()
    result = await db.execute(
        select(OneCDocument)
        .where(OneCDocument.org_id == org_id, OneCDocument.status == "pending")
        .order_by(OneCDocument.due_date.asc().nullslast())
    )
    docs = list(result.scalars().all())
    await db.commit()
    return docs


async def list_onec_documents(
    db: AsyncSession,
    org_id: str,
    status: Optional[str] = None,
) -> list[OneCDocument]:
    stmt = select(OneCDocument).where(OneCDocument.org_id == org_id)
    if status:
        stmt = stmt.where(OneCDocument.status == status)
    stmt = stmt.order_by(OneCDocument.due_date.asc().nullslast())
    result = await db.execute(stmt)
    return list(result.scalars().all())


def _next_doc_number(db_docs: list[BankDocument], org_id: str) -> str:
    nums = []
    for d in db_docs:
        raw = d.doc_number.replace("№", "").strip()
        try:
            nums.append(int(raw))
        except ValueError:
            pass
    n = max(nums, default=100) + 1
    return f"№ {n}"


async def import_onec_document(
    db: AsyncSession,
    org_id: str,
    onec_id: str,
) -> tuple[OneCDocument, BankDocument]:
    """Преобразует документ 1С в платёжное поручение банка (PostgreSQL)."""
    doc = await db.get(OneCDocument, onec_id)
    if not doc or doc.org_id != org_id:
        raise ValueError("Документ 1С не найден")
    if doc.status == "imported":
        raise ValueError("Документ уже импортирован")

    existing = await db.execute(select(BankDocument).where(BankDocument.org_id == org_id))
    bank_docs = list(existing.scalars().all())
    doc_number = _next_doc_number(bank_docs, org_id)
    today = datetime.utcnow().strftime("%d.%m.%Y")
    doc_type = DOC_KIND_LABELS.get(doc.doc_kind, "Перевод в BYN")
    if doc.doc_kind == "payroll":
        doc_type = "Зарплатный проект"

    bank_doc = BankDocument(
        id=str(__import__("uuid").uuid4()),
        org_id=org_id,
        doc_number=doc_number,
        doc_date=today,
        doc_type=doc_type,
        counterparty=doc.counterparty,
        amount=doc.amount,
        currency=doc.currency,
        status="На подписи",
        purpose=doc.purpose,
    )
    db.add(bank_doc)

    doc.status = "imported"
    doc.bank_doc_number = doc_number
    doc.imported_at = datetime.utcnow()

    await db.commit()
    await db.refresh(doc)
    await db.refresh(bank_doc)
    return doc, bank_doc


async def import_batch(
    db: AsyncSession,
    org_id: str,
    onec_ids: list[str],
) -> list[tuple[OneCDocument, BankDocument]]:
    results = []
    for oid in onec_ids:
        try:
            pair = await import_onec_document(db, org_id, oid)
            results.append(pair)
        except ValueError:
            continue
    return results


def format_onec_doc_line(doc: OneCDocument) -> str:
    kind = DOC_KIND_LABELS.get(doc.doc_kind, doc.doc_kind)
    return (
        f"• {kind}: {doc.counterparty} — {doc.amount:.2f} {doc.currency}"
        f" (срок: {doc.due_date or '—'}, статус: {doc.status})"
    )
