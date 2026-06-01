"""Payment form helpers — OCR fill from photos."""
from __future__ import annotations

import base64
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from models.schemas import AssistantResponse, FormFieldAction
from services.forms.ocr_text_parser import parse_ocr_text_to_form_actions
from services.ocr.imagetotext import OcrError, recognize_base64_image

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
    return image


@router.post("/ocr-fill", response_model=AssistantResponse)
async def ocr_fill_form(request: OcrFillRequest):
    """Recognize text from a payment document photo and return form_actions."""
    form_type = request.form_type.lower().strip()
    if form_type not in ("paydocby", "instant", "paydoccur"):
        raise HTTPException(status_code=400, detail="Unsupported form_type")

    b64 = _strip_data_url(request.image)
    try:
        base64.b64decode(b64, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 image") from exc

    try:
        ocr_text = await recognize_base64_image(b64)
    except OcrError as exc:
        raise HTTPException(
            status_code=exc.status_code or 502,
            detail=str(exc),
        ) from exc

    actions: list[FormFieldAction] = parse_ocr_text_to_form_actions(ocr_text, form_type)

    if not actions:
        preview = ocr_text[:400] + ("…" if len(ocr_text) > 400 else "")
        return AssistantResponse(
            message=(
                "Текст с фото распознан, но поля формы автоматически не определены.\n\n"
                f"Распознанный текст:\n{preview}\n\n"
                "Попробуйте другое фото или укажите данные вручную в чате."
            ),
            session_id=request.session_id or "ocr",
            form_fill_status="partial",
        )

    filled_labels = ", ".join(
        a.label or a.field.split(".")[-1] for a in actions
    )
    preview = ocr_text[:280] + ("…" if len(ocr_text) > 280 else "")

    return AssistantResponse(
        message=(
            f"Распознано с фото и подготовлено к заполнению: {filled_labels}.\n\n"
            f"Фрагмент текста:\n{preview}"
        ),
        session_id=request.session_id or "ocr",
        form_actions=actions,
        form_fill_status="partial",
    )
