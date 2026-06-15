"""Лёгкие миграции для демо-БД (без Alembic)."""
from __future__ import annotations

import logging

from sqlalchemy import text

from db.database import engine

logger = logging.getLogger(__name__)

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
    "ALTER TABLE counterparties ADD COLUMN IF NOT EXISTS risk_score FLOAT DEFAULT 50.0",
    "ALTER TABLE counterparties ADD COLUMN IF NOT EXISTS risk_level VARCHAR DEFAULT 'medium'",
    "ALTER TABLE counterparties ADD COLUMN IF NOT EXISTS risk_notes TEXT DEFAULT ''",
    "ALTER TABLE organization_profiles ADD COLUMN IF NOT EXISTS app_role VARCHAR",
]


async def run_migrations():
    async with engine.begin() as conn:
        for stmt in PG_MIGRATIONS:
            try:
                await conn.execute(text(stmt))
            except Exception as exc:  # noqa: BLE001
                # IF NOT EXISTS уже защищает от повторов, но если миграция
                # валится по другой причине — это нужно увидеть в логах
                logger.warning("migration step skipped: %s | %s", stmt[:60], exc)

