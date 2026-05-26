from pydantic import BaseModel
from typing import Optional


# ─── Auth ─────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ─── Chat ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

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
    url: str
    variant: str = "primary"  # "primary" | "secondary"

class AssistantResponse(BaseModel):
    message: str
    session_id: str
    navigation_path: Optional[list[NavigationStep]] = None
    products: Optional[list[BankProduct]] = None
    action_buttons: Optional[list[ActionButton]] = None


# ─── Products ─────────────────────────────────────────

class ProductSearchParams(BaseModel):
    product_type: Optional[str] = None  # "credit" | "deposit" | "investment"
    max_rate: Optional[float] = None
    min_rate: Optional[float] = None
    amount: Optional[float] = None
    term_months: Optional[int] = None
