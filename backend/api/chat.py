from fastapi import APIRouter, Depends, HTTPException
from models.schemas import ChatRequest, AssistantResponse
from services.ai.assistant import AssistantService
from core.dependencies import get_current_user
from db.models import User

router = APIRouter()


@router.post("", response_model=AssistantResponse)
async def chat(
    request: ChatRequest,
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
    """Получить историю диалога сессии."""
    # TODO: реализовать
    return {"session_id": session_id, "messages": []}
