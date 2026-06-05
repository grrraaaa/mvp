"""Normalize DATABASE_URL / POSTGRES_URL for SQLAlchemy async (PostgreSQL only)."""
from __future__ import annotations

import os
from pathlib import Path

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


def resolve_database_url() -> str:
    """Vercel Postgres injects POSTGRES_URL; also accept DATABASE_URL."""
    url = (
        os.getenv("POSTGRES_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_PRISMA_URL")  # Vercel legacy name
        or ""
    ).strip()

    if not url:
        raise RuntimeError(
            "DATABASE_URL or POSTGRES_URL is required (PostgreSQL only). "
            "Example: postgresql+asyncpg://sber:sber@127.0.0.1:5432/sber"
        )

    normalized = normalize_async_url(url)
    if not normalized.startswith("postgresql"):
        raise RuntimeError(f"Only PostgreSQL is supported; got: {normalized.split('://', 1)[0]}")
    return normalized


def normalize_async_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url
