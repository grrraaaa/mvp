"""Normalize DATABASE_URL / POSTGRES_URL for SQLAlchemy async (PostgreSQL only)."""
from __future__ import annotations

import os
import re
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

# mvp/.env — loaded before database.py imports
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
if _ENV_FILE.is_file():
    for line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip()
        if key and key not in os.environ:
            os.environ[key] = val

# asyncpg не понимает channel_binding из Neon/Vercel шаблона
_STRIP_QUERY_KEYS = frozenset({"channel_binding", "connect_timeout"})


def _pick_raw_url(*, prefer_direct: bool = False) -> str:
    if prefer_direct:
        for key in (
            "POSTGRES_URL_NON_POOLING",
            "DATABASE_URL_UNPOOLED",
            "POSTGRES_URL_NO_SSL",
        ):
            val = os.getenv(key, "").strip()
            if val:
                return val
    for key in ("POSTGRES_URL", "DATABASE_URL", "POSTGRES_PRISMA_URL"):
        val = os.getenv(key, "").strip()
        if val:
            return val
    return ""


def _sanitize_query(url: str) -> str:
    """Убрать параметры, ломающие asyncpg."""
    if "?" not in url:
        return url
    base, _, query = url.partition("?")
    if not query:
        return base
    params = parse_qs(query, keep_blank_values=True)
    for key in list(params.keys()):
        if key in _STRIP_QUERY_KEYS:
            params.pop(key, None)
    if not params:
        return base.rstrip("?")
    flat = {k: (v[0] if v else "") for k, v in params.items()}
    return f"{base}?{urlencode(flat)}"


def normalize_async_url(url: str) -> str:
    url = url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    url = _sanitize_query(url)
    # на всякий случай regex
    url = re.sub(r"[&?]channel_binding=[^&]*", "", url)
    url = url.rstrip("?&")
    return url


def resolve_database_url(*, prefer_direct: bool = False) -> str:
    """Runtime URL (pooler на Neon — норм для SELECT/INSERT)."""
    url = _pick_raw_url(prefer_direct=prefer_direct)
    if not url:
        raise RuntimeError(
            "DATABASE_URL or POSTGRES_URL is required (PostgreSQL only). "
            "Connect Neon/Postgres in Vercel → Storage."
        )
    normalized = normalize_async_url(url)
    if not normalized.startswith("postgresql"):
        raise RuntimeError(f"Only PostgreSQL is supported; got: {normalized.split('://', 1)[0]}")
    return normalized


def resolve_init_database_url() -> str:
    """DDL + сиды — прямое подключение Neon без pooler."""
    return resolve_database_url(prefer_direct=True)
