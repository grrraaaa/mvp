"""ImageToText.com OCR API client."""
from __future__ import annotations

import logging
import re

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

OCR_ENDPOINT = "https://www.imagetotext.com/api/ocr"


class OcrError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _clean_base64(image_b64: str) -> str:
    """Strip data-URL prefix and whitespace from base64 payload."""
    raw = image_b64.strip()
    if raw.startswith("data:"):
        comma = raw.find(",")
        if comma >= 0:
            raw = raw[comma + 1 :]
    return re.sub(r"\s+", "", raw)


async def recognize_base64_image(image_b64: str) -> str:
    """Send base64 image to imagetotext.com and return plain text."""
    if not settings.IMAGETOTEXT_API_KEY or not settings.IMAGETOTEXT_API_SECRET:
        raise OcrError(
            "OCR не настроен: задайте IMAGETOTEXT_API_KEY и IMAGETOTEXT_API_SECRET в .env"
        )

    payload = {
        "api_key": settings.IMAGETOTEXT_API_KEY,
        "api_secret": settings.IMAGETOTEXT_API_SECRET,
        "image": _clean_base64(image_b64),
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            OCR_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )

    text = (response.text or "").strip()

    if response.status_code == 200:
        if not text:
            raise OcrError("На изображении не найден текст", status_code=404)
        return text

    if response.status_code == 404:
        raise OcrError(text or "На изображении не найден текст", status_code=404)

    raise OcrError(
        text or f"OCR ошибка HTTP {response.status_code}",
        status_code=response.status_code,
    )
