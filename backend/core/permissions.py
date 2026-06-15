"""Права доступа для ассистента.

Сейчас frontend делит роли на manager/admin/user (через RoleSelector) и
по факту admin не должен работать с документами и платежами через ИИ.
Бэкенд проверяет роль и блокирует:
  - открытие/создание документов,
  - навигацию на /other/documents* и /payments/* через ассистента,
  - заполнение форм через form_actions,
  - зарплатную ведомость (run-payroll).
"""
from __future__ import annotations
from typing import Optional

# Маппинг из старых ролей OrganizationProfile.user_role (businessman|accountant|ip)
# в UI-роли (manager|admin|user), если app_role не задан.
_DEFAULT_ROLE_MAP: dict[str, str] = {
    "businessman": "manager",
    "accountant": "admin",
    "ip": "user",
}

# Какие пермишены есть у каждой UI-роли. Должно совпадать с frontend/src/lib/banking/roles.ts.
_PERMISSIONS: dict[str, set[str]] = {
    "manager": {
        "sign_document",
        "create_document",
        "pay_payroll",
        "open_account",
        "manage_products",
        "edit_account",
        "verify_counterparty",
        "order_cash",
        "manage_employees",
        "open_document",
        "format_document_ai",
    },
    "admin": {
        "manage_security",
        "manage_services",
        "manage_employees",
        "edit_account",
        "verify_counterparty",
    },
    "user": {
        "create_document",
        "verify_counterparty",
        "open_document",
        "format_document_ai",
    },
}

# Маршруты, на которые admin нельзя переходить через ассистента.
_ADMIN_BLOCKED_ROUTES = (
    "/other/documents",
    "/other/documents/",
    "/other/documents/view",
    "/statement",
    "/statement/",
    "/salary",
    "/salary/",
    "/payments",
    "/payments/",
    "/payments/paydocbyn",
    "/payments/paydoccur",
    "/payments/instant",
    "/payments/currency",
    "/payments/order",
)


def resolve_app_role(
    org_app_role: Optional[str],
    user_role: Optional[str],
    request_app_role: Optional[str] = None,
) -> str:
    """Определить итоговую UI-роль. Приоритет:
      1) request_app_role (фронт прислал явно из RoleSelector)
      2) org_app_role (OrganizationProfile.app_role в БД)
      3) маппинг user_role → app_role
      4) manager (по умолчанию)
    """
    if request_app_role in ("manager", "admin", "user"):
        return request_app_role
    if org_app_role in ("manager", "admin", "user"):
        return org_app_role
    if user_role in _DEFAULT_ROLE_MAP:
        return _DEFAULT_ROLE_MAP[user_role]
    return "manager"


def can(role: str, permission: str) -> bool:
    return permission in _PERMISSIONS.get(role, set())


def role_label(role: str) -> str:
    return {
        "manager": "Руководитель",
        "admin": "Администратор",
        "user": "ИП",
    }.get(role, role)


def permission_label(permission: str) -> str:
    return {
        "sign_document": "подписание документов",
        "create_document": "создание документов",
        "pay_payroll": "выплата зарплаты",
        "manage_employees": "управление сотрудниками",
        "open_account": "открытие счетов",
        "manage_products": "управление продуктами",
        "edit_account": "редактирование счетов",
        "manage_security": "настройки безопасности",
        "manage_services": "управление сервисами",
        "verify_counterparty": "проверка контрагентов",
        "order_cash": "кассовые операции",
        "open_document": "открытие документов через ИИ-ассистента",
        "format_document_ai": "форматирование документов с помощью ИИ-ассистента",
    }.get(permission, permission)


def deny_title(role: str, permission: str) -> str:
    return f"Недостаточно прав: «{permission_label(permission)}» недоступно для роли «{role_label(role)}»"


def is_route_blocked_for_role(route: str, role: str) -> bool:
    """Проверить, можно ли переходить на route для роли (через ассистента)."""
    if role != "admin":
        return False
    if not route:
        return False
    # Прямое или вложенное совпадение с запрещёнными префиксами.
    for blocked in _ADMIN_BLOCKED_ROUTES:
        if route == blocked or route.startswith(blocked):
            return True
    return False


def format_deny_message(route: str, role: str) -> str:
    """Текст ошибки для маршрута, на который admin не может переходить."""
    if route.startswith("/payments") or route == "/payments":
        perm = "format_document_ai"
    elif route.startswith("/other/documents") or route.startswith("/statement") or route.startswith("/salary"):
        perm = "open_document"
    else:
        perm = "open_document"
    return (
        f"🚫 {deny_title(role, perm)}\n\n"
        "ИИ-ассистент не может переходить в этот раздел для вашей роли."
    )
