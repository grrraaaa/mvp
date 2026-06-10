"""Banking demo data routes — scoped by user org."""
from __future__ import annotations

from collections import defaultdict

import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user, get_optional_user
from core.tenant import user_org_id
from db.database import get_db
from db.models import (
    AnalyticsMonthly,
    BankAccount,
    BankDocument,
    BankService,
    Counterparty,
    Employee,
    OrganizationProfile,
    PaymentRequest,
    SmartNotification,
    StatementLine,
    User,
)
from models.schemas import (
    BankAccountOut,
    BankDocumentOut,
    BankingSummaryOut,
    ChartSpec,
    CounterpartyOut,
    CreateAccountRequest,
    CreateDocumentRequest,
    CreateEmployeeRequest,
    CreatePaymentRequest,
    CurrencyBalance,
    EmployeeOut,
    OrgProfileOut,
    PatchAccountNoteRequest,
    PaymentRequestOut,
    SmartNotificationOut,
    SourceRef,
    StatementLineOut,
    UpdateDocumentRequest,
)
from services.banking.analytics import (
    cash_gap_forecast,
    compare_months,
    monthly_expenses,
    to_chart_bar,
    to_chart_line,
    to_chart_pie,
)
from services.banking.search import format_search_response, smart_search

router = APIRouter()


def _org_filter(model, org_id: str):
    return select(model).where(model.org_id == org_id)


@router.get("/accounts", response_model=list[BankAccountOut])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    result = await db.execute(_org_filter(BankAccount, org_id))
    rows = result.scalars().all()
    return [
        BankAccountOut(
            id=a.iban,
            type=a.account_type,
            label=a.label,
            balance=a.balance,
            currency=a.currency,
            hidden=a.hidden,
            note=a.note or "",
        )
        for a in rows
    ]


async def _resolve_document(db: AsyncSession, org_id: str, doc_id: str) -> BankDocument | None:
    row = await db.get(BankDocument, doc_id)
    if row and row.org_id == org_id:
        return row
    result = await db.execute(
        select(BankDocument).where(
            BankDocument.org_id == org_id,
            BankDocument.doc_number == doc_id,
        )
    )
    return result.scalar_one_or_none()


@router.get("/documents/{doc_id}", response_model=BankDocumentOut)
async def get_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
    org_id: str | None = Query(None),
):
    org_id = org_id or (user_org_id(current_user) if current_user else "demo")
    doc = await _resolve_document(db, org_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    return BankDocumentOut(
        id=doc.id,
        date=doc.doc_date,
        type=doc.doc_type,
        counterparty=doc.counterparty,
        amount=doc.amount,
        currency=doc.currency,
        status=doc.status,
        purpose=doc.purpose,
        doc_number=doc.doc_number,
    )


@router.get("/documents", response_model=list[BankDocumentOut])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
    org_id: str | None = Query(None),
    doc_type: str | None = Query(None, alias="doc_type"),
    doc_prefix: str | None = Query(None, alias="doc_prefix"),
    status: str | None = Query(None),
):
    org_id = org_id or (user_org_id(current_user) if current_user else "demo")
    stmt = _org_filter(BankDocument, org_id)
    if doc_prefix:
        stmt = stmt.where(BankDocument.doc_type.startswith(doc_prefix))
    elif doc_type:
        stmt = stmt.where(BankDocument.doc_type == doc_type)
    if status:
        stmt = stmt.where(BankDocument.status == status)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        BankDocumentOut(
            id=d.id,
            date=d.doc_date,
            type=d.doc_type,
            counterparty=d.counterparty,
            amount=d.amount,
            currency=d.currency,
            status=d.status,
            purpose=d.purpose,
            doc_number=d.doc_number,
        )
        for d in rows
    ]


@router.get("/employees", response_model=list[EmployeeOut])
async def list_employees(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    result = await db.execute(_org_filter(Employee, org_id))
    rows = result.scalars().all()
    return [
        EmployeeOut(
            id=e.id,
            fullName=e.full_name,
            cardNumber=e.card_mask,
            amount=e.amount,
            status=e.status,
        )
        for e in rows
    ]


@router.get("/counterparties", response_model=list[CounterpartyOut])
async def list_counterparties(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    result = await db.execute(_org_filter(Counterparty, org_id))
    rows = result.scalars().all()
    return [
        CounterpartyOut(
            id=c.id,
            name=c.name,
            unp=c.unp,
            account=c.account,
            bank_name=c.bank_name,
            risk_score=getattr(c, "risk_score", 50.0) or 50.0,
            risk_level=getattr(c, "risk_level", "medium") or "medium",
            risk_notes=getattr(c, "risk_notes", "") or "",
        )
        for c in rows
    ]


@router.get("/summary", response_model=BankingSummaryOut)
async def banking_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    result = await db.execute(
        select(BankAccount).where(BankAccount.org_id == org_id, BankAccount.hidden == False)
    )
    accounts = result.scalars().all()
    totals: dict[str, float] = defaultdict(float)
    for acc in accounts:
        totals[acc.currency] += acc.balance
    balances = [
        CurrencyBalance(currency=cur, total=round(total, 2))
        for cur, total in sorted(totals.items())
    ]
    return BankingSummaryOut(balances=balances, total_accounts=len(accounts))


@router.get("/org", response_model=OrgProfileOut)
async def get_org_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    org = await db.get(OrganizationProfile, org_id)
    if not org:
        return OrgProfileOut(org_name="DEMO ЮРИДИЧЕСКОЕ ЛИЦО", user_role="businessman", daily_payment_limit=5000.0)
    return OrgProfileOut(org_name=org.org_name, user_role=org.user_role, daily_payment_limit=org.daily_payment_limit)


@router.get("/notifications", response_model=list[SmartNotificationOut])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    unread_only: bool = True,
):
    from services.banking.notifications import resolve_notification_action_url

    org_id = user_org_id(current_user)
    stmt = select(SmartNotification).where(SmartNotification.org_id == org_id)
    if unread_only:
        stmt = stmt.where(SmartNotification.is_read == False)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    out: list[SmartNotificationOut] = []
    for n in rows:
        action_url = await resolve_notification_action_url(db, org_id, n)
        out.append(
            SmartNotificationOut(
                id=n.id,
                title=n.title,
                body=n.body,
                severity=n.severity,
                category=n.category,
                action_url=action_url,
                action_label=n.action_label,
                due_date=n.due_date,
                is_read=n.is_read,
            )
        )
    return out


@router.get("/services", response_model=list[dict])
async def list_services(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BankService))
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "tariff": s.tariff,
            "connect_url": s.connect_url,
        }
        for s in result.scalars().all()
    ]


@router.post("/documents", response_model=BankDocumentOut)
async def create_document(
    body: CreateDocumentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    today = datetime.utcnow().strftime("%d.%m.%Y")
    existing = await db.execute(_org_filter(BankDocument, org_id))
    nums = []
    for d in existing.scalars().all():
        raw = d.doc_number.replace("№", "").strip()
        try:
            nums.append(int(raw))
        except ValueError:
            pass
    doc_number = f"№ {max(nums, default=100) + 1}"
    row = BankDocument(
        id=str(uuid.uuid4()),
        org_id=org_id,
        doc_number=doc_number,
        doc_date=today,
        doc_type=body.type,
        counterparty=body.counterparty,
        amount=body.amount,
        currency=body.currency,
        status=body.status or "На подписи",
        purpose=body.purpose,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return BankDocumentOut(
        id=row.id,
        date=row.doc_date,
        type=row.doc_type,
        counterparty=row.counterparty,
        amount=row.amount,
        currency=row.currency,
        status=row.status,
        purpose=row.purpose,
        doc_number=row.doc_number,
    )


@router.post("/documents/{doc_id}/sign", response_model=BankDocumentOut)
async def sign_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    doc = await _resolve_document(db, org_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    if doc.status != "На подписи":
        raise HTTPException(status_code=400, detail="Документ не на подписи")

    doc.status = "Проведен"
    acc_result = await db.execute(
        select(BankAccount).where(
            BankAccount.org_id == org_id,
            BankAccount.currency == doc.currency,
            BankAccount.hidden == False,
        )
    )
    account = acc_result.scalars().first()
    if account:
        account.balance = max(0.0, account.balance - doc.amount)

    await db.commit()
    await db.refresh(doc)
    return BankDocumentOut(
        id=doc.id,
        date=doc.doc_date,
        type=doc.doc_type,
        counterparty=doc.counterparty,
        amount=doc.amount,
        currency=doc.currency,
        status=doc.status,
        purpose=doc.purpose,
        doc_number=doc.doc_number,
    )


def _doc_out(doc: BankDocument) -> BankDocumentOut:
    return BankDocumentOut(
        id=doc.id,
        date=doc.doc_date,
        type=doc.doc_type,
        counterparty=doc.counterparty,
        amount=doc.amount,
        currency=doc.currency,
        status=doc.status,
        purpose=doc.purpose,
        doc_number=doc.doc_number,
    )


@router.patch("/documents/{doc_id}", response_model=BankDocumentOut)
async def update_document(
    doc_id: str,
    body: UpdateDocumentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """CRUD: частичное обновление документа (тип, контрагент, сумма, назначение, статус)."""
    org_id = user_org_id(current_user)
    doc = await _resolve_document(db, org_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    if body.type is not None:
        doc.doc_type = body.type
    if body.counterparty is not None:
        doc.counterparty = body.counterparty
    if body.amount is not None:
        doc.amount = body.amount
    if body.currency is not None:
        doc.currency = body.currency
    if body.purpose is not None:
        doc.purpose = body.purpose
    if body.status is not None:
        doc.status = body.status
    await db.commit()
    await db.refresh(doc)
    return _doc_out(doc)


@router.delete("/documents/{doc_id}", response_model=BankDocumentOut)
async def delete_document(
    doc_id: str,
    hard: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """CRUD: удаление. По умолчанию мягкое (статус «Удален»), hard=true — из БД."""
    org_id = user_org_id(current_user)
    doc = await _resolve_document(db, org_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    out = _doc_out(doc)
    if hard or doc.status == "Удален":
        await db.delete(doc)
    else:
        doc.status = "Удален"
        out.status = "Удален"
    await db.commit()
    return out


@router.get("/documents/{doc_id}/pdf")
async def download_document_pdf(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
    org_id: str | None = Query(None),
):
    """Сформировать и отдать PDF документа."""
    from fastapi import Response

    from services.banking.pdf_export import render_document_pdf

    org_id = org_id or (user_org_id(current_user) if current_user else "demo")
    doc = await _resolve_document(db, org_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")

    org = await db.get(OrganizationProfile, org_id)
    pdf_bytes = render_document_pdf(
        {
            "id": doc.id,
            "doc_number": doc.doc_number,
            "doc_date": doc.doc_date,
            "doc_type": doc.doc_type,
            "counterparty": doc.counterparty,
            "amount": doc.amount,
            "currency": doc.currency,
            "status": doc.status,
            "purpose": doc.purpose,
        },
        org_name=org.org_name if org else "DEMO ЮРИДИЧЕСКОЕ ЛИЦО",
    )
    safe_name = re.sub(r"[^\w-]+", "_", doc.doc_number or doc.id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="document_{safe_name}.pdf"',
            "Cache-Control": "no-store",
        },
    )


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    notif = await db.get(SmartNotification, notification_id)
    if not notif or notif.org_id != org_id:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    notif.is_read = True
    await db.commit()
    return {"ok": True}


def _parse_stmt_date(s: str):
    from datetime import datetime

    parts = (s or "").split(".")
    if len(parts) == 3:
        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
        if y < 100:
            y += 2000
        return datetime(y, m, d)
    return None


def _statement_anchor_date():
    from datetime import datetime

    from core.config import settings

    return _parse_stmt_date(settings.DEMO_STATEMENT_ANCHOR) or datetime(2026, 6, 6)


def _filter_statement_period(rows: list, period: str) -> list:
    from datetime import timedelta

    p = (period or "month").lower()
    if not rows:
        return rows

    anchor = _statement_anchor_date()
    parsed = [(r, _parse_stmt_date(r.operation_date)) for r in rows]
    parsed = [(r, dt) for r, dt in parsed if dt is not None]
    if not parsed:
        return rows

    if p in ("today", "сегодня"):
        target = anchor.strftime("%d.%m.%Y")
        return [r for r, _ in parsed if r.operation_date == target]

    if p in ("yesterday", "вчера"):
        target = (anchor - timedelta(days=1)).strftime("%d.%m.%Y")
        return [r for r, _ in parsed if r.operation_date == target]

    if p in ("week", "5days", "5дней"):
        cut = anchor - timedelta(days=5)
        return [r for r, dt in parsed if dt >= cut]

    ym = re.match(r"^(20\d{2})-(0[1-9]|1[0-2])$", p)
    if ym:
        year = int(ym.group(1))
        month = int(ym.group(2))
        return [r for r, dt in parsed if dt.year == year and dt.month == month]

    if p in ("month", "месяц"):
        return [r for r, dt in parsed if dt.year == anchor.year and dt.month == anchor.month]

    if p in ("quarter", "квартал"):
        q_start = ((anchor.month - 1) // 3) * 3 + 1
        q_end = q_start + 2
        return [
            r for r, dt in parsed if dt.year == anchor.year and q_start <= dt.month <= q_end
        ]

    if p in ("year", "год"):
        return [r for r, dt in parsed if dt.year == anchor.year]

    return rows


@router.get("/statement", response_model=list[StatementLineOut])
async def get_statement(
    account_id: str | None = None,
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    stmt = select(StatementLine).where(StatementLine.org_id == org_id)
    if account_id:
        stmt = stmt.where(StatementLine.account_id == account_id)
    stmt = stmt.order_by(StatementLine.operation_date.desc())
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    rows = _filter_statement_period(rows, period)

    return [
        StatementLineOut(
            id=r.id,
            account_id=r.account_id,
            operation_date=r.operation_date,
            debit=r.debit,
            credit=r.credit,
            balance_after=r.balance_after,
            counterparty=r.counterparty,
            purpose=r.purpose,
            doc_ref=r.doc_ref,
        )
        for r in rows
    ]


@router.post("/requests", response_model=PaymentRequestOut)
async def create_payment_request(
    body: CreatePaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    row = PaymentRequest(
        id=str(uuid.uuid4()),
        org_id=org_id,
        request_type=body.request_type,
        status="pending",
        payload=body.payload,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return PaymentRequestOut(
        id=row.id,
        request_type=row.request_type,
        status=row.status,
        payload=row.payload,
        created_at=row.created_at.isoformat(),
    )


@router.get("/requests", response_model=list[PaymentRequestOut])
async def list_payment_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    result = await db.execute(
        select(PaymentRequest).where(PaymentRequest.org_id == org_id).order_by(PaymentRequest.created_at.desc())
    )
    return [
        PaymentRequestOut(
            id=r.id,
            request_type=r.request_type,
            status=r.status,
            payload=r.payload,
            created_at=r.created_at.isoformat(),
        )
        for r in result.scalars().all()
    ]


@router.get("/analytics/monthly")
async def analytics_monthly(
    month: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    items = await monthly_expenses(db, org_id, month)
    chart = to_chart_pie("Структура расходов", items) if items else None
    return {"items": items, "chart": chart}


@router.get("/analytics/compare")
async def analytics_compare(
    month_a: str = "2026-02",
    month_b: str = "2026-03",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    data = await compare_months(db, org_id, month_a, month_b)
    chart = to_chart_bar(
        f"Сравнение {month_a} и {month_b}",
        [month_a, month_b],
        [data["amount_a"], data["amount_b"]],
    )
    return {**data, "chart": chart}


@router.get("/analytics/cash-gap")
async def analytics_cash_gap(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    data = await cash_gap_forecast(db, org_id)
    chart = to_chart_line("Прогноз остатка", data["forecast"])
    return {**data, "chart": chart}


@router.patch("/accounts/{account_id}/note", response_model=BankAccountOut)
async def patch_account_note(
    account_id: str,
    body: PatchAccountNoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    acc = await db.get(BankAccount, account_id)
    if not acc or acc.org_id != org_id:
        raise HTTPException(status_code=404, detail="Счёт не найден")
    # «Заметка» в UI — видимый бейдж счёта: храним в обоих полях
    acc.note = body.note
    acc.label = body.note
    await db.commit()
    await db.refresh(acc)
    return BankAccountOut(
        id=acc.iban,
        type=acc.account_type,
        label=acc.label,
        balance=acc.balance,
        currency=acc.currency,
        hidden=acc.hidden,
        note=acc.note or "",
    )


@router.post("/employees", response_model=EmployeeOut)
async def create_employee(
    body: CreateEmployeeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    emp_id = f"EMP-{uuid.uuid4().hex[:6].upper()}"
    row = Employee(
        id=emp_id,
        org_id=org_id,
        full_name=body.full_name,
        card_mask=body.card_mask,
        amount=body.amount,
        status="Готов",
    )
    db.add(row)
    await db.commit()
    return EmployeeOut(
        id=row.id,
        fullName=row.full_name,
        cardNumber=row.card_mask,
        amount=row.amount,
        status=row.status,
    )


@router.post("/accounts", response_model=BankAccountOut)
async def create_account(
    body: CreateAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    import random

    suffix = {"BYN": "2933", "USD": "0840", "EUR": "0978", "RUB": "0643"}.get(body.currency, "2933")
    iban = (
        f"BY{random.randint(10, 99)} BPSB 3012 "
        f"{random.randint(1000, 9999)} {random.randint(1000, 9999)} {suffix} {random.randint(1000, 9999)}"
    )
    row = BankAccount(
        iban=iban,
        org_id=org_id,
        account_type=body.account_type,
        label=body.label or "Новый счёт",
        balance=0.0,
        currency=body.currency,
        hidden=False,
        note="",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return BankAccountOut(
        id=row.iban,
        type=row.account_type,
        label=row.label,
        balance=row.balance,
        currency=row.currency,
        hidden=row.hidden,
        note=row.note or "",
    )


@router.get("/search")
async def banking_search(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    hits = await smart_search(db, q, org_id=org_id)
    text, sources = format_search_response(q, hits)
    return {
        "query": q,
        "message": text,
        "hits": [
            {
                "kind": h.kind,
                "id": h.id,
                "title": h.title,
                "subtitle": h.subtitle,
                "amount": h.amount,
                "currency": h.currency,
                "status": h.status,
                "url": h.url,
            }
            for h in hits
        ],
        "sources": [SourceRef(**s) for s in sources],
    }


@router.get("/gateway/payments")
async def list_gateway_payments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from services.banking.gateway_sim import gateway_to_dict, list_gateway_payments as list_gp

    org_id = user_org_id(current_user)
    rows = await list_gp(db, org_id)
    return [gateway_to_dict(r) for r in rows]


@router.post("/gateway/payments/{payment_id}/advance")
async def advance_gateway_payment(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from services.banking.gateway_sim import advance_gateway_status, gateway_to_dict

    org_id = user_org_id(current_user)
    row = await advance_gateway_status(db, payment_id)
    if not row or row.org_id != org_id:
        raise HTTPException(status_code=404, detail="Payment not found")
    return gateway_to_dict(row)


@router.post("/documents/{doc_id}/submit-gateway")
async def submit_document_to_gateway(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Simulate sending signed document to SBBOL payment gateway."""
    from services.banking.gateway_sim import create_gateway_payment, gateway_to_dict

    org_id = user_org_id(current_user)
    doc = await _resolve_document(db, org_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    gp = await create_gateway_payment(
        db,
        org_id,
        amount=doc.amount,
        currency=doc.currency,
        counterparty=doc.counterparty,
        purpose=doc.purpose,
        bank_doc_id=doc.id,
    )
    doc.status = "В обработке"
    await db.commit()
    return gateway_to_dict(gp)
