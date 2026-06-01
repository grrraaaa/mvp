<<<<<<< HEAD
"""Chat route — main AI assistant endpoint."""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.schemas import ChatRequest, AssistantResponse
from services.ai.assistant import AssistantService
from core.dependencies import get_current_user
=======
from fastapi import APIRouter, Depends, HTTPException
from models.schemas import ChatRequest, AssistantResponse
from services.ai.assistant import AssistantService
from core.dependencies import get_current_user
from db.models import User
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42

router = APIRouter()


@router.post("", response_model=AssistantResponse)
async def chat(
    request: ChatRequest,
<<<<<<< HEAD
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
=======
    current_user: User = Depends(get_current_user),
    assistant: AssistantService = Depends(),
):
    """
    Отправить сообщение AI-ассистенту.
    Возвращает ответ с текстом, навигационным путём и рекомендациями.
    """
    try:
        response = await assistant.process(
            message=request.message,
            session_id=request.session_id,
            user_id=current_user.id,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{session_id}")
async def get_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
    """Получить историю диалога сессии."""
    # TODO: реализовать
    return {"session_id": session_id, "messages": []}
