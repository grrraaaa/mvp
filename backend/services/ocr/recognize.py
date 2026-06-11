"""OCR с fallback: ImageToText → OCR.space → ошибка."""
from __future__ import annotations

import logging

import httpx

from core.config import settings
from services.ocr import imagetotext, ocrspace
from services.ocr.imagetotext import OcrError

logger = logging.getLogger(__name__)

Provider = str  # imagetotext | ocrspace


async def recognize_payment_image(image_b64: str) -> tuple[str, Provider]:
    """
    Распознать текст с фото счёта/платёжки.
    Сначала ImageToText; при ошибке или таймауте — OCR.space.
    """
    errors: list[str] = []
    has_primary = bool(settings.IMAGETOTEXT_API_KEY and settings.IMAGETOTEXT_API_SECRET)
    has_fallback = bool(settings.OCR_SPACE_API_KEY)

    if has_primary:
        try:
            text = await imagetotext.recognize_base64_image(image_b64)
            return text, "imagetotext"
        except OcrError as exc:
            errors.append(f"ImageToText: {exc}")
            logger.warning("Primary OCR failed, trying OCR.space: %s", exc)
        except httpx.HTTPError as exc:
            errors.append(f"ImageToText: сеть — {exc}")
            logger.warning("Primary OCR network error, trying OCR.space: %s", exc)

    if has_fallback:
        try:
            text = await ocrspace.recognize_base64_image(image_b64)
            return text, "ocrspace"
        except OcrError as exc:
            errors.append(f"OCR.space: {exc}")
        except httpx.HTTPError as exc:
            errors.append(f"OCR.space: сеть — {exc}")

    if not has_primary and not has_fallback:
        raise OcrError(
            "OCR не настроен: задайте IMAGETOTEXT_API_KEY/IMAGETOTEXT_API_SECRET "
            "или OCR_SPACE_API_KEY в .env"
        )

    raise OcrError("; ".join(errors) or "OCR недоступен")
