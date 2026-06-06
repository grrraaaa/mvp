from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    login: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    org_id: Mapped[str] = mapped_column(String, default="demo")
    display_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sessions: Mapped[List["ChatSession"]] = relationship(back_populates="user")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[Optional["User"]] = relationship(back_populates="sessions")
    messages: Mapped[List["Message"]] = relationship(back_populates="session")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.id"))
    role: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["ChatSession"] = relationship(back_populates="messages")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String)
    rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    iban: Mapped[str] = mapped_column(String, primary_key=True)
    org_id: Mapped[str] = mapped_column(String, default="demo", index=True)
    account_type: Mapped[str] = mapped_column(String, nullable=False)
    label: Mapped[str] = mapped_column(String, default="")
    balance: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String, nullable=False)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str] = mapped_column(String, default="")


class BankDocument(Base):
    __tablename__ = "bank_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String, default="demo", index=True)
    doc_number: Mapped[str] = mapped_column(String, nullable=False)
    doc_date: Mapped[str] = mapped_column(String, nullable=False)
    doc_type: Mapped[str] = mapped_column(String, nullable=False)
    counterparty: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    purpose: Mapped[str] = mapped_column(Text, default="")


class Counterparty(Base):
    __tablename__ = "counterparties"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String, default="demo", index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    unp: Mapped[str] = mapped_column(String, default="")
    account: Mapped[str] = mapped_column(String, default="")
    bank_name: Mapped[str] = mapped_column(String, default="")
    risk_score: Mapped[float] = mapped_column(Float, default=50.0)
    risk_level: Mapped[str] = mapped_column(String, default="medium")
    risk_notes: Mapped[str] = mapped_column(Text, default="")


class TaxDeadline(Base):
    __tablename__ = "tax_deadlines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    due_date: Mapped[str] = mapped_column(String, nullable=False)
    org_type: Mapped[str] = mapped_column(String, default="all")
    description: Mapped[str] = mapped_column(Text, default="")
    demo_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)


class InsuranceProduct(Base):
    __tablename__ = "insurance_products"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    premium_from: Mapped[float] = mapped_column(Float, default=0.0)
    coverage: Mapped[str] = mapped_column(String, default="")
    keywords: Mapped[str] = mapped_column(String, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class GatewayPayment(Base):
    __tablename__ = "gateway_payments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String, index=True)
    bank_doc_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String, default="BYN")
    counterparty: Mapped[str] = mapped_column(String, default="")
    purpose: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="pending")
    status_message: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    org_id: Mapped[str] = mapped_column(String, default="demo", index=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    card_mask: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)


class OrganizationProfile(Base):
    """Профиль демо-организации (singleton id=demo)."""

    __tablename__ = "organization_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default="demo")
    org_name: Mapped[str] = mapped_column(String, nullable=False)
    user_role: Mapped[str] = mapped_column(String, default="businessman")  # businessman | accountant | ip
    daily_payment_limit: Mapped[float] = mapped_column(Float, default=5000.0)


class SmartNotification(Base):
    __tablename__ = "smart_notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String, default="demo", index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String, default="info")  # info | warn | critical
    category: Mapped[str] = mapped_column(String, default="general")
    action_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    action_label: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    due_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)


class BankService(Base):
    """Каталог банковских сервисов для консультаций."""

    __tablename__ = "bank_services"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    tariff: Mapped[str] = mapped_column(String, default="")
    connect_url: Mapped[str] = mapped_column(String, default="/services")
    keywords: Mapped[str] = mapped_column(String, default="")


class OneCConnection(Base):
    """Эмуляция подключения к 1С — состояние хранится в PostgreSQL."""

    __tablename__ = "onec_connections"

    org_id: Mapped[str] = mapped_column(String, primary_key=True)
    server_url: Mapped[str] = mapped_column(String, default="http://1c-emulator.local/sber")
    access_token: Mapped[str] = mapped_column(String, default="demo-1c-token")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class OneCDocument(Base):
    """Документы «из 1С»: платёжные требования, налоги, ТТН, зарплата, договоры."""

    __tablename__ = "onec_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String, index=True)
    external_id: Mapped[str] = mapped_column(String, nullable=False)
    doc_kind: Mapped[str] = mapped_column(String, nullable=False)
    counterparty: Mapped[str] = mapped_column(String, nullable=False)
    unp: Mapped[str] = mapped_column(String, default="")
    iban: Mapped[str] = mapped_column(String, default="")
    bik: Mapped[str] = mapped_column(String, default="")
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String, default="BYN")
    purpose: Mapped[str] = mapped_column(Text, default="")
    payment_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    due_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    bank_doc_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    imported_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class StatementLine(Base):
    """Строки банковской выписки."""

    __tablename__ = "statement_lines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String, index=True)
    account_id: Mapped[str] = mapped_column(String, nullable=False)
    operation_date: Mapped[str] = mapped_column(String, nullable=False)
    debit: Mapped[float] = mapped_column(Float, default=0.0)
    credit: Mapped[float] = mapped_column(Float, default=0.0)
    balance_after: Mapped[float] = mapped_column(Float, default=0.0)
    counterparty: Mapped[str] = mapped_column(String, default="")
    purpose: Mapped[str] = mapped_column(Text, default="")
    doc_ref: Mapped[str] = mapped_column(String, default="")


class PaymentRequest(Base):
    """Заявки: касса, FX, справки, сервисы."""

    __tablename__ = "payment_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String, index=True)
    request_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AnalyticsMonthly(Base):
    """Агрегаты расходов по категориям для диаграмм."""

    __tablename__ = "analytics_monthly"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String, index=True)
    month: Mapped[str] = mapped_column(String, nullable=False)  # YYYY-MM
    category: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String, default="BYN")
