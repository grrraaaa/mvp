"""Extract payment form fields from OCR text via OpenAI / OpenRouter."""
from __future__ import annotations

import json
import logging
from typing import List, Optional

from core.config import settings
from models.schemas import FormFieldAction
from services.ai.form_schemas import fillable_fields, load_form_schema
from services.forms.field_value_formats import (
    build_field_format_instructions,
    build_fill_tool,
    normalize_field_value,
)

logger = logging.getLogger(__name__)


def _llm_client():
    from openai import AsyncOpenAI

    kwargs: dict = {"api_key": settings.OPENAI_API_KEY}
    if settings.OPENAI_BASE_URL:
        kwargs["base_url"] = settings.OPENAI_BASE_URL

    headers: dict[str, str] = {}
    if settings.OPENROUTER_SITE_URL:
        headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
    if settings.OPENROUTER_APP_NAME:
        headers["X-Title"] = settings.OPENROUTER_APP_NAME
    if headers:
        kwargs["default_headers"] = headers

    return AsyncOpenAI(**kwargs)


def _validate_actions(actions: List[FormFieldAction], schema: dict) -> List[FormFieldAction]:
    by_name = {f["name"]: f for f in schema.get("fields", [])}
    validated: List[FormFieldAction] = []

    for action in actions:
        field_meta = by_name.get(action.field)
        if not field_meta:
            continue

        key = field_meta.get("key", "")
        normalized = normalize_field_value(key, str(action.value))
        if not normalized:
            continue

        if field_meta.get("type") in ("radio", "checkbox") and not normalized.isdigit():
            continue

        validated.append(
            FormFieldAction(
                field=action.field,
                value=normalized,
                label=action.label or field_meta.get("label"),
            )
        )

    return validated


async def parse_ocr_text_with_llm(text: str, form_type: str) -> Optional[List[FormFieldAction]]:
    """Use LLM to map OCR plain text to form field actions."""
    if not settings.OPENAI_API_KEY:
        return None

    schema = load_form_schema(form_type)
    if not schema:
        return None

    format_instructions = build_field_format_instructions(schema)
    fill_tool = build_fill_tool(schema)
    allowed_names = {f["name"] for f in fillable_fields(schema)}

    system = (
        "Ты извлекаешь реквизиты из OCR-текста белорусского платёжного документа "
        f"для формы «{schema.get('title', form_type)}».\n\n"
        "Задача: вернуть fill_payment_form с полями, которые можно уверенно определить из текста.\n"
        "Получатель — поставщик/бенефициар из счёта, НЕ покупатель/плательщик.\n\n"
        f"{format_instructions}"
    )

    user = (
        "OCR-текст с фото:\n\n"
        f"{text.strip()}\n\n"
        "Верни fill_payment_form. Для каждого поля value ОБЯЗАН соответствовать формату из инструкции. "
        f"field — только один из: {', '.join(sorted(allowed_names))}."
    )

    try:
        client = _llm_client()
        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            tools=[fill_tool],
            tool_choice={"type": "function", "function": {"name": "fill_payment_form"}},
            temperature=0,
        )
        ai_msg = resp.choices[0].message
        if not ai_msg.tool_calls:
            return None

        args = json.loads(ai_msg.tool_calls[0].function.arguments)
        raw = [
            FormFieldAction(
                field=str(item["field"]),
                value=str(item["value"]),
                label=item.get("label"),
            )
            for item in args.get("fields", [])
            if item.get("field") and item.get("value") is not None
        ]
        validated = _validate_actions(raw, schema)
        return validated or None
    except Exception:
        logger.exception("OCR LLM parse failed")
        return None
