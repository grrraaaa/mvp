"""Chat route — main AI assistant endpoint."""
from __future__ import annotations
import asyncio
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest, AssistantResponse
from services.ai.assistant import AssistantService
from services.chat.enrichment import enrich_response
from services.chat.history import load_history, save_message
from core.dependencies import get_current_user
from db.database import AsyncSessionLocal
from db.models import OrganizationProfile

router = APIRouter()


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

    async def event_stream():
        words = response.message.split()
        accumulated = ""
        for word in words:
            accumulated += word + " "
            payload = json.dumps({"token": word + " ", "partial": accumulated.strip()}, ensure_ascii=False)
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.025)
        done = json.dumps({"done": True, **response.model_dump()}, ensure_ascii=False, default=str)
        yield f"data: {done}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    """Получить историю диалога сессии."""
    messages = await load_history(session_id)
    return {"session_id": session_id, "messages": messages}
