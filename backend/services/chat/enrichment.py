"""Enrich assistant responses before returning to client."""
from __future__ import annotations

from typing import Any

from models.schemas import AssistantResponse
from services.chat.response_meta import detect_response_tone, emotion_for_tone
from services.chat.session_sources import register_sources
from services.chat.suggested_chips import suggest_chips


async def enrich_response(
    response: AssistantResponse,
    *,
    user_message: str,
    page_route: str | None = None,
    form_type: str | None = None,
    user_role: str = "businessman",
) -> AssistantResponse:
    data = response.model_dump()
    tone = detect_response_tone(user_message, data)
    emotion = emotion_for_tone(tone)

    sources_raw = []
    if response.sources:
        for s in response.sources:
            sources_raw.append(s.model_dump() if hasattr(s, "model_dump") else dict(s))

    register_sources(response.session_id, sources_raw)

    chips = suggest_chips(
        message=user_message,
        response=data,
        page_route=page_route,
        form_type=form_type,
        user_role=user_role,
    )

    return response.model_copy(
        update={
            "suggested_chips": chips or None,
            "response_tone": tone,
            "character_emotion": emotion,
        }
    )
