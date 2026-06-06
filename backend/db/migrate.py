"""Лёгкие миграции для демо-БД (без Alembic)."""
from __future__ import annotations

from sqlalchemy import text

from db.database import engine

PG_MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS login VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id VARCHAR DEFAULT 'demo'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR",
    "ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS org_id VARCHAR DEFAULT 'demo'",
    "ALTER TABLE bank_documents ADD COLUMN IF NOT EXISTS org_id VARCHAR DEFAULT 'demo'",
    "ALTER TABLE employees ADD COLUMN IF NOT EXISTS org_id VARCHAR DEFAULT 'demo'",
    "ALTER TABLE counterparties ADD COLUMN IF NOT EXISTS org_id VARCHAR DEFAULT 'demo'",
    "ALTER TABLE smart_notifications ADD COLUMN IF NOT EXISTS org_id VARCHAR DEFAULT 'demo'",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_login ON users (login)",
    "UPDATE bank_accounts SET org_id = 'demo' WHERE org_id IS NULL",
    "UPDATE bank_documents SET org_id = 'demo' WHERE org_id IS NULL",
    "UPDATE employees SET org_id = 'demo' WHERE org_id IS NULL",
    "UPDATE counterparties SET org_id = 'demo' WHERE org_id IS NULL",
    "UPDATE smart_notifications SET org_id = 'demo' WHERE org_id IS NULL",
    "ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS note VARCHAR DEFAULT ''",
]


async def run_migrations():
    async with engine.begin() as conn:
        for stmt in PG_MIGRATIONS:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass
