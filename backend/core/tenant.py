"""Multi-tenant helpers — org_id из JWT-пользователя."""
from __future__ import annotations

from db.models import User


def user_org_id(user: User) -> str:
    return user.org_id or "demo"
