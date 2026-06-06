"""Chat message persistence — ChatSession + Message tables."""
from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import AsyncSessionLocal
from db.models import ChatSession, Message


async def ensure_session(session_id: str, user_id: str | None = None) -> str:
    async with AsyncSessionLocal() as db:
        existing = await db.get(ChatSession, session_id)
        if existing:
            return session_id
        sid = session_id or str(uuid.uuid4())
        db.add(ChatSession(id=sid, user_id=user_id if user_id and user_id != "guest" else None))
        await db.commit()
        return sid


async def save_message(
    session_id: str,
    role: str,
    content: str,
    metadata: dict[str, Any] | None = None,
    user_id: str | None = None,
) -> None:
    await ensure_session(session_id, user_id)
    async with AsyncSessionLocal() as db:
        db.add(
            Message(
                id=str(uuid.uuid4()),
                session_id=session_id,
                role=role,
                content=content,
                metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
            )
        )
        await db.commit()


async def load_history(session_id: str, limit: int = 100) -> list[dict[str, Any]]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        rows = result.scalars().all()
    out: list[dict[str, Any]] = []
    for m in rows:
        meta: dict[str, Any] = {}
        if m.metadata_json:
            try:
                meta = json.loads(m.metadata_json)
            except json.JSONDecodeError:
                pass
        out.append({"role": m.role, "content": m.content, **meta})
    return out
