"""Normalize DATABASE_URL / POSTGRES_URL for SQLAlchemy async."""
from __future__ import annotations

import os


def resolve_database_url() -> str:
    """Vercel Postgres injects POSTGRES_URL; also accept DATABASE_URL."""
    url = (
        os.getenv("POSTGRES_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_PRISMA_URL")  # Vercel legacy name
        or ""
    ).strip()

    if not url:
        if os.getenv("VERCEL") == "1":
            raise RuntimeError(
                "PostgreSQL не настроен: подключите Vercel Postgres (Storage) "
                "или задайте POSTGRES_URL / DATABASE_URL."
            )
        return "sqlite+aiosqlite:///./data/sber.db"

    return normalize_async_url(url)


def normalize_async_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url
