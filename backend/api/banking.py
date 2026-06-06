"""Banking demo data routes — scoped by user org."""
from __future__ import annotations

from collections import defaultdict

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user
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


@router.get("/documents", response_model=list[BankDocumentOut])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    result = await db.execute(_org_filter(BankDocument, org_id))
    rows = result.scalars().all()
    return [
        BankDocumentOut(
            id=d.doc_number,
            date=d.doc_date,
            type=d.doc_type,
            counterparty=d.counterparty,
            amount=d.amount,
            currency=d.currency,
            status=d.status,
            purpose=d.purpose,
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
    org_id = user_org_id(current_user)
    stmt = select(SmartNotification).where(SmartNotification.org_id == org_id)
    if unread_only:
        stmt = stmt.where(SmartNotification.is_read == False)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        SmartNotificationOut(
            id=n.id,
            title=n.title,
            body=n.body,
            severity=n.severity,
            category=n.category,
            action_url=n.action_url,
            action_label=n.action_label,
            due_date=n.due_date,
            is_read=n.is_read,
        )
        for n in rows
    ]


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
        status="На подписи",
        purpose=body.purpose,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return BankDocumentOut(
        id=row.doc_number,
        date=row.doc_date,
        type=row.doc_type,
        counterparty=row.counterparty,
        amount=row.amount,
        currency=row.currency,
        status=row.status,
        purpose=row.purpose,
    )


@router.post("/documents/{doc_id}/sign", response_model=BankDocumentOut)
async def sign_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = user_org_id(current_user)
    result = await db.execute(
        select(BankDocument).where(
            BankDocument.org_id == org_id,
            BankDocument.doc_number == doc_id,
        )
    )
    doc = result.scalar_one_or_none()
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
        id=doc.doc_number,
        date=doc.doc_date,
        type=doc.doc_type,
        counterparty=doc.counterparty,
        amount=doc.amount,
        currency=doc.currency,
        status=doc.status,
        purpose=doc.purpose,
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
    rows = result.scalars().all()
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
    acc.note = body.note
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
