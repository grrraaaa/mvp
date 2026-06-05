from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, List


# ─── Auth ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class LoginRequest(BaseModel):
    login: Optional[str] = None
    email: Optional[str] = None
    password: str

class AuthUserOut(BaseModel):
    id: str
    login: str
    org_id: str
    org_name: str
    display_name: Optional[str] = None
    user_role: str = "businessman"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[AuthUserOut] = None


# ─── Chat ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    page_route: Optional[str] = None
    form_type: Optional[str] = None  # paydocby | instant | paydoccur
    org_id: Optional[str] = None

class NavigationStep(BaseModel):
    label: str
    url: str
    icon: Optional[str] = None

class BankProduct(BaseModel):
    id: str
    name: str
    type: str
    rate: Optional[float] = None
    description: Optional[str] = None
    url: str

class ActionButton(BaseModel):
    label: str
    url: Optional[str] = None
    message: Optional[str] = None  # если задано — отправить текст в чат
    variant: str = "primary"  # "primary" | "secondary"


class SourceRef(BaseModel):
    index: int
    label: str
    kind: str = "document"
    id: Optional[str] = None
    url: Optional[str] = None


class SmartNotificationOut(BaseModel):
    id: str
    title: str
    body: str
    severity: str
    category: str
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    due_date: Optional[str] = None
    is_read: bool = False


class OrgProfileOut(BaseModel):
    org_name: str
    user_role: str
    daily_payment_limit: float

class FormFieldAction(BaseModel):
    field: str  # DOM name attribute, e.g. forms.PAYDOCBY.COMMON_COLUMNS_AMOUNT
    value: str
    label: Optional[str] = None


class UiAction(BaseModel):
    """Действие в интерфейсе: клик по кнопке, навигация, модалка, заполнение поля."""
    type: str  # click | navigate | open_modal | fill
    target: str
    value: Optional[str] = None


class AssistantResponse(BaseModel):
    message: str
    session_id: str
    navigation_path: Optional[List[NavigationStep]] = None
    products: Optional[List[BankProduct]] = None
    action_buttons: Optional[List[ActionButton]] = None
    form_actions: Optional[List[FormFieldAction]] = None
    ui_actions: Optional[List[UiAction]] = None
    pending_form_fields: Optional[List[str]] = None
    form_fill_status: Optional[str] = None  # collecting | partial | complete
    sources: Optional[List[SourceRef]] = None
    stream: bool = False


# ─── Products ─────────────────────────────────────────

class ProductSearchParams(BaseModel):
    product_type: Optional[str] = None  # "credit" | "deposit" | "investment"
    max_rate: Optional[float] = None
    min_rate: Optional[float] = None
    amount: Optional[float] = None
    term_months: Optional[int] = None


# ─── Banking ──────────────────────────────────────────

class BankAccountOut(BaseModel):
    id: str
    type: str
    label: str
    balance: float
    currency: str
    hidden: bool = False


class BankDocumentOut(BaseModel):
    id: str
    date: str
    type: str
    counterparty: str
    amount: float
    currency: str
    status: str
    purpose: str


class EmployeeOut(BaseModel):
    id: str
    fullName: str
    cardNumber: str
    amount: float
    status: str


class CounterpartyOut(BaseModel):
    id: str
    name: str
    unp: str
    account: str
    bank_name: str


class CurrencyBalance(BaseModel):
    currency: str
    total: float


class BankingSummaryOut(BaseModel):
    balances: List[CurrencyBalance]
    total_accounts: int


class CreateDocumentRequest(BaseModel):
    type: str = "Перевод в BYN"
    counterparty: str
    amount: float
    currency: str = "BYN"
    purpose: str = ""


class OneCConnectRequest(BaseModel):
    server_url: str = "http://1c-emulator.local/sber"
    access_token: str = "demo-1c-token"


class OneCDocumentOut(BaseModel):
    id: str
    external_id: str
    doc_kind: str
    doc_kind_label: str
    counterparty: str
    unp: str = ""
    iban: str = ""
    bik: str = ""
    amount: float
    currency: str
    purpose: str
    payment_code: Optional[str] = None
    due_date: Optional[str] = None
    status: str
    bank_doc_number: Optional[str] = None


class OneCConnectionOut(BaseModel):
    org_id: str
    server_url: str
    is_active: bool
    last_sync_at: Optional[str] = None
    pending_count: int = 0


class OneCImportBatchRequest(BaseModel):
    document_ids: List[str]
