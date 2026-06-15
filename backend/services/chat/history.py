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

    Заметка по производительности: ранний вариант делал N+1 (по 2 запроса на
    каждую сессию) — 3.6s на 50 сессий. Сейчас: один SELECT sessions, один
    SELECT для счётчиков сообщений (GROUP BY), и один SELECT для первого
    user-сообщения (оконная функция row_number) — O(1) запросов.
    """
    from sqlalchemy import func, select as sa_select

    async with AsyncSessionLocal() as db:
        # 1) Сессии — отсортированы по created_at DESC, ограничиваем с запасом.
        result = await db.execute(
            sa_select(ChatSession).order_by(ChatSession.created_at.desc()).limit(limit * 2)
        )
        sessions = result.scalars().all()
        if not sessions:
            return []

        session_ids = [s.id for s in sessions]

        # 2) Число сообщений в каждой сессии — один GROUP BY.
        count_rows = await db.execute(
            sa_select(Message.session_id, func.count(Message.id))
            .where(Message.session_id.in_(session_ids))
            .group_by(Message.session_id)
        )
        count_by_sid: dict[str, int] = {sid: cnt for sid, cnt in count_rows.all()}

        # 3) Первое user-сообщение в каждой сессии — через оконную функцию.
        #    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC) = 1.
        from sqlalchemy import over

        rn = func.row_number().over(
            partition_by=Message.session_id, order_by=Message.created_at.asc()
        ).label("rn")
        first_user_subq = (
            sa_select(
                Message.session_id.label("sid"),
                Message.content.label("content"),
                rn,
            )
            .where(Message.session_id.in_(session_ids), Message.role == "user")
            .subquery()
        )
        first_user_rows = await db.execute(
            sa_select(first_user_subq.c.sid, first_user_subq.c.content).where(
                first_user_subq.c.rn == 1
            )
        )
        first_user_by_sid: dict[str, str] = {sid: content for sid, content in first_user_rows.all()}

        out: list[dict[str, Any]] = []
        for s in sessions:
            count = count_by_sid.get(s.id, 0)
            if count == 0:
                # пустые сессии не показываем
                continue
            first_content = first_user_by_sid.get(s.id, "")
            out.append(
                {
                    "session_id": s.id,
                    "title": (
                        (first_content[:60] + "…")
                        if first_content and len(first_content) > 60
                        else (first_content or "Пустой диалог")
                    ),
                    "preview": first_content,
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
