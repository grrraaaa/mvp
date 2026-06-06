"""Simulated SBBOL payment gateway — status transitions."""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import BankAccount, BankDocument, GatewayPayment


async def create_gateway_payment(
    session: AsyncSession,
    org_id: str,
    *,
    amount: float,
    currency: str = "BYN",
    counterparty: str = "",
    purpose: str = "",
    bank_doc_id: str | None = None,
) -> GatewayPayment:
    row = GatewayPayment(
        id=str(uuid.uuid4()),
        org_id=org_id,
        bank_doc_id=bank_doc_id,
        amount=amount,
        currency=currency,
        counterparty=counterparty,
        purpose=purpose,
        status="pending",
        status_message="Отправлено в шлюз SBBOL (демо)",
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def advance_gateway_status(session: AsyncSession, payment_id: str) -> GatewayPayment | None:
    row = await session.get(GatewayPayment, payment_id)
    if not row:
        return None
    transitions = {
        "pending": ("processing", "Обработка в банке…"),
        "processing": ("executed", "Платёж исполнен"),
    }
    if row.status == "executed":
        return row
    if row.status == "rejected":
        return row
    # Demo: reject high amounts
    if row.status == "pending" and row.amount > 50000:
        row.status = "rejected"
        row.status_message = "Отклонено: превышен лимит без подтверждения (демо)"
    else:
        next_status, msg = transitions.get(row.status, ("executed", "Исполнено"))
        row.status = next_status
        row.status_message = msg
    row.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(row)
    return row


async def list_gateway_payments(session: AsyncSession, org_id: str, limit: int = 10) -> list[GatewayPayment]:
    result = await session.execute(
        select(GatewayPayment)
        .where(GatewayPayment.org_id == org_id)
        .order_by(GatewayPayment.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def sign_latest_and_submit(
    session: AsyncSession,
    org_id: str,
) -> tuple[BankDocument, GatewayPayment] | None:
    """Sign the newest pending document and submit to demo gateway."""
    result = await session.execute(
        select(BankDocument)
        .where(BankDocument.org_id == org_id, BankDocument.status == "На подписи")
        .order_by(BankDocument.doc_date.desc())
        .limit(1)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        return None

    doc.status = "Проведен"
    acc_result = await session.execute(
        select(BankAccount).where(
            BankAccount.org_id == org_id,
            BankAccount.currency == doc.currency,
            BankAccount.hidden == False,
        )
    )
    account = acc_result.scalars().first()
    if account:
        account.balance = max(0.0, account.balance - doc.amount)

    gp = await create_gateway_payment(
        session,
        org_id,
        amount=doc.amount,
        currency=doc.currency,
        counterparty=doc.counterparty,
        purpose=doc.purpose or "",
        bank_doc_id=doc.id,
    )
    await session.commit()
    await session.refresh(doc)
    return doc, gp


def gateway_to_dict(p: GatewayPayment) -> dict[str, Any]:
    return {
        "id": p.id,
        "amount": p.amount,
        "currency": p.currency,
        "counterparty": p.counterparty,
        "purpose": p.purpose,
        "status": p.status,
        "status_message": p.status_message,
        "bank_doc_id": p.bank_doc_id,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
