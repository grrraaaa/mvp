"""Chat route — main AI assistant endpoint."""
from __future__ import annotations
import asyncio
import json
import logging
import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest, AssistantResponse
from services.ai.assistant import AssistantService
from services.chat.enrichment import enrich_response
from services.chat.history import load_history, list_sessions, save_message
from core.dependencies import get_current_user
from db.database import AsyncSessionLocal
from db.models import OrganizationProfile

router = APIRouter()
logger = logging.getLogger(__name__)


async def _user_role(org_id: str | None) -> str:
    oid = org_id or "demo"
    async with AsyncSessionLocal() as db:
        org = await db.get(OrganizationProfile, oid)
        return org.user_role if org else "businessman"


async def _finalize_chat(
    response: AssistantResponse,
    *,
    user_message: str,
    user_id: str,
    page_route: str | None,
    form_type: str | None,
    org_id: str | None,
) -> AssistantResponse:
    role = await _user_role(org_id)
    enriched = await enrich_response(
        response,
        user_message=user_message,
        page_route=page_route,
        form_type=form_type,
        user_role=role,
    )
    meta = enriched.model_dump(exclude={"message", "session_id", "stream"})
    await save_message(enriched.session_id, "user", user_message, user_id=user_id)
    await save_message(
        enriched.session_id,
        "assistant",
        enriched.message,
        metadata={k: v for k, v in meta.items() if v is not None},
        user_id=user_id,
    )
    return enriched


@router.post("", response_model=AssistantResponse)
async def chat(
    request: ChatRequest,
    current_user=Depends(get_current_user),
):
    assistant = AssistantService()
    response = await assistant.process(
        message=request.message,
        session_id=request.session_id,
        user_id=current_user.id,
        page_route=request.page_route,
        form_type=request.form_type,
        org_id=current_user.org_id,
    )
    return await _finalize_chat(
        response,
        user_message=request.message,
        user_id=current_user.id,
        page_route=request.page_route,
        form_type=request.form_type,
        org_id=current_user.org_id,
    )


@router.post("/guest", response_model=AssistantResponse)
async def chat_guest(request: ChatRequest):
    """Chat without auth — for demo."""
    assistant = AssistantService()
    response = await assistant.process(
        message=request.message,
        session_id=request.session_id,
        user_id="guest",
        page_route=request.page_route,
        form_type=request.form_type,
        org_id=request.org_id,
    )
    return await _finalize_chat(
        response,
        user_message=request.message,
        user_id="guest",
        page_route=request.page_route,
        form_type=request.form_type,
        org_id=request.org_id,
    )


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user=Depends(get_current_user),
):
    """SSE streaming for authenticated users."""
    return await _stream_response(request, user_id=current_user.id, org_id=current_user.org_id)


@router.post("/guest/stream")
async def chat_guest_stream(request: ChatRequest):
    """SSE-стриминг ответа ассистента (демо)."""
    return await _stream_response(request, user_id="guest", org_id=request.org_id)


async def _stream_response(request: ChatRequest, user_id: str, org_id: str | None):
    try:
        assistant = AssistantService()
        response = await assistant.process(
            message=request.message,
            session_id=request.session_id,
            user_id=user_id,
            page_route=request.page_route,
            form_type=request.form_type,
            org_id=org_id,
        )
        response = await _finalize_chat(
            response,
            user_message=request.message,
            user_id=user_id,
            page_route=request.page_route,
            form_type=request.form_type,
            org_id=org_id,
        )
    except Exception as exc:
        logger.exception("chat stream failed: %s", exc)
        raise HTTPException(status_code=500, detail="Не удалось обработать сообщение чата") from exc

    async def event_stream():
        accumulated = ""
        chunks = re.findall(r"\S+\s*|\n+", response.message)
        for chunk in chunks:
            accumulated += chunk
            payload = json.dumps({"token": chunk, "partial": accumulated}, ensure_ascii=False)
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.018 if len(chunk) <= 4 else 0.03)
        done = json.dumps({"done": True, **response.model_dump()}, ensure_ascii=False, default=str)
        yield f"data: {done}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    """Получить историю диалога сессии."""
    messages = await load_history(session_id)
    return {"session_id": session_id, "messages": messages}


@router.get("/sessions")
async def get_sessions(
    current_user=Depends(get_current_user),
    limit: int = 50,
):
    """Архив прошлых сессий текущего пользователя.

    Возвращает список с превью первого user-сообщения, числом сообщений и временем.
    Гостевые сессии (user_id IS NULL) идут отдельным блоком в конце.
    """
    sessions = await list_sessions(user_id=current_user.id, limit=limit)
    return {"sessions": sessions}
