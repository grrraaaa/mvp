"""HTTP Basic Auth — тот же пароль, что и у Next.js middleware (SITE_ACCESS_*)."""
from __future__ import annotations

import base64
import os

from fastapi import Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware


def _credentials_ok(request: Request) -> bool:
    password = os.getenv("SITE_ACCESS_PASSWORD", "").strip()
    if not password:
        return True

    expected_user = os.getenv("SITE_ACCESS_USER", "admin").strip()
    auth = request.headers.get("authorization") or ""
    if not auth.lower().startswith("basic "):
        return False

    try:
        raw = base64.b64decode(auth.split(" ", 1)[1]).decode("utf-8")
    except Exception:
        return False

    user, _, pwd = raw.partition(":")
    return user == expected_user and pwd == password


class SiteBasicAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/health", "/api/health"):
            return await call_next(request)

        if not _credentials_ok(request):
            return Response(
                content="Требуется авторизация",
                status_code=401,
                headers={"WWW-Authenticate": 'Basic realm="Sber Demo (private)"'},
            )

        return await call_next(request)
