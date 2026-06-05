"""Chat route — main AI assistant endpoint."""
from __future__ import annotations
import asyncio
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest, AssistantResponse
from services.ai.assistant import AssistantService
from core.dependencies import get_current_user

router = APIRouter()


@router.post("", response_model=AssistantResponse)
async def chat(
    request: ChatRequest,
    current_user=Depends(get_current_user),
):
    assistant = AssistantService()
    return await assistant.process(
        message=request.message,
        session_id=request.session_id,
        user_id=current_user.id,
        page_route=request.page_route,
        form_type=request.form_type,
        org_id=current_user.org_id,
    )


@router.post("/guest", response_model=AssistantResponse)
async def chat_guest(request: ChatRequest):
    """Chat without auth — for demo."""
    assistant = AssistantService()
    return await assistant.process(
        message=request.message,
        session_id=request.session_id,
        user_id="guest",
        page_route=request.page_route,
        form_type=request.form_type,
        org_id=request.org_id,
    )


@router.post("/guest/stream")
async def chat_guest_stream(request: ChatRequest):
    """SSE-стриминг ответа ассистента (демо)."""
    assistant = AssistantService()
    response = await assistant.process(
        message=request.message,
        session_id=request.session_id,
        user_id="guest",
        page_route=request.page_route,
        form_type=request.form_type,
        org_id=request.org_id,
    )

    async def event_stream():
        words = response.message.split()
        for word in words:
            payload = json.dumps({"token": word + " "}, ensure_ascii=False)
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.03)
        done = json.dumps({"done": True, **response.model_dump()}, ensure_ascii=False, default=str)
        yield f"data: {done}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    """Получить историю диалога сессии."""
    # TODO: реализовать
    return {"session_id": session_id, "messages": []}
