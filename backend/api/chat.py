"""Chat route — main AI assistant endpoint."""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
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
    )


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    """Получить историю диалога сессии."""
    # TODO: реализовать
    return {"session_id": session_id, "messages": []}
