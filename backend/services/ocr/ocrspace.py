"""OCR.space API client (резервный OCR)."""
from __future__ import annotations

import base64
import logging
import re

import httpx

from core.config import settings
from services.ocr.imagetotext import OcrError

logger = logging.getLogger(__name__)

OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image"


def _clean_base64(image_b64: str) -> str:
    raw = image_b64.strip()
    if raw.startswith("data:"):
        comma = raw.find(",")
        if comma >= 0:
            raw = raw[comma + 1 :]
    return re.sub(r"\s+", "", raw)


def _base64_to_data_url(image_b64: str) -> str:
    if image_b64.strip().startswith("data:"):
        return re.sub(r"\s+", "", image_b64.strip())

    clean = _clean_base64(image_b64)
    mime = "image/jpeg"
    try:
        head = base64.b64decode(clean[:48], validate=False)
        if head.startswith(b"\x89PNG"):
            mime = "image/png"
        elif head.startswith(b"%PDF"):
            mime = "application/pdf"
        elif head.startswith(b"\xff\xd8"):
            mime = "image/jpeg"
        elif head.startswith(b"GIF"):
            mime = "image/gif"
    except Exception:
        pass
    return f"data:{mime};base64,{clean}"


async def recognize_base64_image(image_b64: str) -> str:
    """Распознать текст через OCR.space (base64 → multipart)."""
    if not settings.OCR_SPACE_API_KEY:
        raise OcrError("OCR.space не настроен: задайте OCR_SPACE_API_KEY в .env")

    data_url = _base64_to_data_url(image_b64)
    form = {
        "base64Image": data_url,
        "language": settings.OCR_SPACE_LANGUAGE or "rus",
        "isOverlayRequired": "false",
        "detectOrientation": "true",
        "scale": "true",
        "OCREngine": "2",
    }

    async with httpx.AsyncClient(timeout=settings.OCR_SPACE_TIMEOUT) as client:
        response = await client.post(
            OCR_SPACE_ENDPOINT,
            data=form,
            headers={"apikey": settings.OCR_SPACE_API_KEY},
        )

    if response.status_code != 200:
        raise OcrError(
            f"OCR.space HTTP {response.status_code}: {(response.text or '')[:200]}",
            status_code=response.status_code,
        )

    try:
        payload = response.json()
    except Exception as exc:
        raise OcrError(f"OCR.space: невалидный JSON — {exc}") from exc

    if payload.get("IsErroredOnProcessing"):
        details = payload.get("ErrorMessage") or payload.get("ErrorDetails") or "ошибка обработки"
        raise OcrError(f"OCR.space: {details}")

    parts: list[str] = []
    for block in payload.get("ParsedResults") or []:
        if block.get("FileParseExitCode") == -10:
            continue
        text = (block.get("ParsedText") or "").strip()
        if text:
            parts.append(text)

    result = "\n".join(parts).strip()
    if not result:
        raise OcrError("OCR.space: на изображении не найден текст", status_code=404)

    return result
