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


async def list_sessions(user_id: str | None, limit: int = 50) -> list[dict[str, Any]]:
    """Архив: список сессий пользователя с превью первого user-сообщения и числом сообщений.

    Для гостевых сессий user_id IS NULL — показываем их отдельным блоком «Демо».
    Возвращаем в порядке: сначала авторизованные пользовательские, затем гостевые.
    """
    async with AsyncSessionLocal() as db:
        # Берём все сессии: сначала user_id, потом created_at DESC.
        result = await db.execute(
            select(ChatSession).order_by(ChatSession.created_at.desc()).limit(limit * 2)
        )
        sessions = result.scalars().all()

        # Превью первого user-сообщения + общее число сообщений — отдельным запросом.
        # Сортируем по created_at ASC, берём первое.
        out: list[dict[str, Any]] = []
        for s in sessions:
            first_msg = await db.execute(
                select(Message)
                .where(Message.session_id == s.id, Message.role == "user")
                .order_by(Message.created_at.asc())
                .limit(1)
            )
            first = first_msg.scalar_one_or_none()
            count_q = await db.execute(
                select(Message).where(Message.session_id == s.id)
            )
            count = len(count_q.scalars().all())
            if count == 0:
                # пустые сессии не показываем
                continue
            out.append(
                {
                    "session_id": s.id,
                    "title": (first.content[:60] + "…") if first and len(first.content) > 60 else (first.content if first else "Пустой диалог"),
                    "preview": first.content if first else "",
                    "message_count": count,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "is_guest": s.user_id is None,
                }
            )
            if len(out) >= limit:
                break

        # Сортируем: сначала пользовательские (не гость), потом гостевые; внутри — свежие сверху
        out.sort(key=lambda x: (x["is_guest"], x["created_at"] or ""), reverse=True)
        return out
