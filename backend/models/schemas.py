from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, List


# ─── Auth ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Chat ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    page_route: Optional[str] = None
    form_type: Optional[str] = None  # paydocby | instant | paydoccur

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

class FormFieldAction(BaseModel):
    field: str  # DOM name attribute, e.g. forms.PAYDOCBY.COMMON_COLUMNS_AMOUNT
    value: str
    label: Optional[str] = None

class AssistantResponse(BaseModel):
    message: str
    session_id: str
    navigation_path: Optional[List[NavigationStep]] = None
    products: Optional[List[BankProduct]] = None
    action_buttons: Optional[List[ActionButton]] = None
    form_actions: Optional[List[FormFieldAction]] = None
    pending_form_fields: Optional[List[str]] = None
    form_fill_status: Optional[str] = None  # collecting | partial | complete


# ─── Products ─────────────────────────────────────────

class ProductSearchParams(BaseModel):
    product_type: Optional[str] = None  # "credit" | "deposit" | "investment"
    max_rate: Optional[float] = None
    min_rate: Optional[float] = None
    amount: Optional[float] = None
    term_months: Optional[int] = None
