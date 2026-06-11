"""Payment form helpers — OCR fill from photos."""
from __future__ import annotations

import base64
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.config import settings
from models.schemas import AssistantResponse, FormFieldAction
from services.ai.form_schemas import load_form_schema
from services.forms.field_value_formats import normalize_form_actions
from services.forms.ocr_llm_parser import parse_ocr_text_with_llm
from services.forms.ocr_text_parser import parse_ocr_text_to_form_actions
from services.chat.enrichment import enrich_response
from services.ocr.demo_fallback import demo_ocr_from_image_b64, is_pdf_data_url
from services.ocr.imagetotext import OcrError
from services.ocr.recognize import recognize_payment_image

router = APIRouter()


class OcrFillRequest(BaseModel):
    image: str = Field(..., description="Base64-encoded image (with or without data-URL prefix)")
    form_type: str = Field(..., description="paydocby | instant | paydoccur")
    session_id: str | None = None


def _strip_data_url(image: str) -> str:
    image = image.strip()
    if image.startswith("data:"):
        m = re.match(r"data:image/[^;]+;base64,(.+)", image, re.I | re.S)
        if m:
            return m.group(1).strip()
        m_pdf = re.match(r"data:application/pdf;base64,(.+)", image, re.I | re.S)
        if m_pdf:
            return m_pdf.group(1).strip()
    return image


@router.post("/ocr-fill", response_model=AssistantResponse)
async def ocr_fill_form(request: OcrFillRequest):
    """Recognize text from a payment document photo and return form_actions."""
    form_type = request.form_type.lower().strip()
    if form_type not in ("paydocby", "instant", "paydoccur"):
        raise HTTPException(status_code=400, detail="Unsupported form_type")

    raw_image = request.image.strip()
    if is_pdf_data_url(raw_image):
        ocr_text, demo_mode = demo_ocr_from_image_b64("pdf")
        demo_note = "\n\n_(PDF распознан в демо-режиме — проверьте поля перед отправкой.)_"
    else:
        b64 = _strip_data_url(raw_image)
        try:
            base64.b64decode(b64, validate=True)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid base64 image") from exc

        demo_mode = False
        demo_note = ""
        has_ocr = bool(
            (settings.IMAGETOTEXT_API_KEY and settings.IMAGETOTEXT_API_SECRET)
            or settings.OCR_SPACE_API_KEY
        )
        if has_ocr:
            try:
                ocr_text, ocr_provider = await recognize_payment_image(b64)
                if ocr_provider == "ocrspace":
                    demo_note = (
                        "\n\n_(Распознано через резервный OCR OCR.space — проверьте поля.)_"
                    )
            except OcrError as exc:
                raise HTTPException(
                    status_code=exc.status_code or 502,
                    detail=str(exc),
                ) from exc
        else:
            ocr_text, demo_mode = demo_ocr_from_image_b64(b64)
            demo_note = "\n\n_(Демо OCR без API-ключей — проверьте и подтвердите поля.)_"

    schema = load_form_schema(form_type) or {}
    rule_actions = normalize_form_actions(
        parse_ocr_text_to_form_actions(ocr_text, form_type),
        schema,
    )
    llm_actions = await parse_ocr_text_with_llm(ocr_text, form_type)
    if llm_actions:
        merged: dict[str, FormFieldAction] = {a.field: a for a in rule_actions}
        for action in llm_actions:
            merged[action.field] = action
        actions = list(merged.values())
        llm_note = "\n\n_(Поля извлечены через OpenAI по тексту OCR.)_"
    else:
        actions = rule_actions
        llm_note = ""
        if settings.OPENAI_API_KEY:
            llm_note = "\n\n_(OpenAI недоступен — использованы правила распознавания.)_"

    if not actions:
        preview = ocr_text[:400] + ("…" if len(ocr_text) > 400 else "")
        partial = AssistantResponse(
            message=(
                "Текст с фото распознан, но поля формы автоматически не определены.\n\n"
                f"Распознанный текст:\n{preview}\n\n"
                "Попробуйте другое фото или укажите данные вручную в чате."
                f"{demo_note}{llm_note}"
            ),
            session_id=request.session_id or "ocr",
            form_fill_status="partial",
        )
        return await enrich_response(
            partial,
            user_message="ocr",
            page_route=None,
            form_type=form_type,
        )

    filled_labels = ", ".join(a.label or a.field.split(".")[-1] for a in actions)
    preview = ocr_text[:280] + ("…" if len(ocr_text) > 280 else "")

    complete = AssistantResponse(
        message=(
            f"Распознано с фото и подготовлено к заполнению: {filled_labels}.\n\n"
            f"Фрагмент текста:\n{preview}"
            f"{demo_note}{llm_note}"
        ),
        session_id=request.session_id or "ocr",
        form_actions=actions,
        form_fill_status="partial" if demo_mode else "complete",
        suggested_chips=["Подтвердить реквизиты", "Исправь сумму", "Проверь УНП"],
    )
    return await enrich_response(
        complete,
        user_message="ocr",
        page_route=None,
        form_type=form_type,
    )
