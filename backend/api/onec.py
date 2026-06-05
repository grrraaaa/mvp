"""API эмулятора 1С — данные в PostgreSQL, org-scoped."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user
from core.tenant import user_org_id
from db.database import get_db
from db.models import OneCDocument, User
from models.schemas import (
    BankDocumentOut,
    OneCConnectRequest,
    OneCConnectionOut,
    OneCDocumentOut,
    OneCImportBatchRequest,
)
from services.onec.connector import (
    DOC_KIND_LABELS,
    connect_1c,
    get_or_create_connection,
    import_batch,
    import_onec_document,
    list_onec_documents,
    sync_from_1c,
)

router = APIRouter()


def _onec_out(doc: OneCDocument) -> OneCDocumentOut:
    return OneCDocumentOut(
        id=doc.id,
        external_id=doc.external_id,
        doc_kind=doc.doc_kind,
        doc_kind_label=DOC_KIND_LABELS.get(doc.doc_kind, doc.doc_kind),
        counterparty=doc.counterparty,
        unp=doc.unp or "",
        iban=doc.iban or "",
        bik=doc.bik or "",
        amount=doc.amount,
        currency=doc.currency,
        purpose=doc.purpose or "",
        payment_code=doc.payment_code,
        due_date=doc.due_date,
        status=doc.status,
        bank_doc_number=doc.bank_doc_number,
    )


@router.get("/status", response_model=OneCConnectionOut)
async def onec_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    conn = await get_or_create_connection(db, org_id)
    pending = await db.execute(
        select(func.count())
        .select_from(OneCDocument)
        .where(OneCDocument.org_id == org_id, OneCDocument.status == "pending")
    )
    count = pending.scalar() or 0
    sync_at = conn.last_sync_at.isoformat() if conn.last_sync_at else None
    return OneCConnectionOut(
        org_id=org_id,
        server_url=conn.server_url,
        is_active=conn.is_active,
        last_sync_at=sync_at,
        pending_count=count,
    )


@router.post("/connect", response_model=OneCConnectionOut)
async def onec_connect(
    body: OneCConnectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    conn = await connect_1c(db, org_id, body.server_url, body.access_token)
    pending = await db.execute(
        select(func.count())
        .select_from(OneCDocument)
        .where(OneCDocument.org_id == org_id, OneCDocument.status == "pending")
    )
    return OneCConnectionOut(
        org_id=org_id,
        server_url=conn.server_url,
        is_active=conn.is_active,
        last_sync_at=conn.last_sync_at.isoformat() if conn.last_sync_at else None,
        pending_count=pending.scalar() or 0,
    )


@router.post("/sync", response_model=list[OneCDocumentOut])
async def onec_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    docs = await sync_from_1c(db, org_id)
    return [_onec_out(d) for d in docs]


@router.get("/documents", response_model=list[OneCDocumentOut])
async def onec_list_documents(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    docs = await list_onec_documents(db, org_id, status=status)
    return [_onec_out(d) for d in docs]


@router.post("/documents/{doc_id}/import", response_model=BankDocumentOut)
async def onec_import_one(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    try:
        _, bank_doc = await import_onec_document(db, org_id, doc_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return BankDocumentOut(
        id=bank_doc.doc_number,
        date=bank_doc.doc_date,
        type=bank_doc.doc_type,
        counterparty=bank_doc.counterparty,
        amount=bank_doc.amount,
        currency=bank_doc.currency,
        status=bank_doc.status,
        purpose=bank_doc.purpose,
    )


@router.post("/import-batch", response_model=list[BankDocumentOut])
async def onec_import_batch(
    body: OneCImportBatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    pairs = await import_batch(db, org_id, body.document_ids)
    return [
        BankDocumentOut(
            id=b.doc_number,
            date=b.doc_date,
            type=b.doc_type,
            counterparty=b.counterparty,
            amount=b.amount,
            currency=b.currency,
            status=b.status,
            purpose=b.purpose,
        )
        for _, b in pairs
    ]
