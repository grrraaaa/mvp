"""Extract payment form fields from OCR text via OpenAI / OpenRouter."""
from __future__ import annotations

import json
import logging
from typing import List, Optional

from core.config import settings
from models.schemas import FormFieldAction
from services.ai.form_schemas import fillable_fields, load_form_schema, schema_field_summary

logger = logging.getLogger(__name__)

FILL_TOOL = {
    "type": "function",
    "function": {
        "name": "fill_payment_form",
        "description": "Заполнить поля платёжной формы SBBOL по распознанному тексту",
        "parameters": {
            "type": "object",
            "properties": {
                "fields": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "field": {"type": "string", "description": "DOM name атрибут поля"},
                            "value": {"type": "string"},
                            "label": {"type": "string"},
                        },
                        "required": ["field", "value"],
                    },
                },
            },
            "required": ["fields"],
        },
    },
}


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
        if not action.value or not str(action.value).strip():
            continue
        field_meta = by_name.get(action.field)
        if not field_meta:
            continue
        if field_meta.get("type") in ("radio", "checkbox") and not str(action.value).strip().isdigit():
            continue
        validated.append(
            FormFieldAction(
                field=action.field,
                value=str(action.value).strip(),
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

    fillable = fillable_fields(schema)
    field_keys = ", ".join(f["key"] for f in fillable)

    system = (
        "Ты помощник банка SBBOL. На входе — сырой текст OCR со счёта, платёжки или счёта на оплату (Беларусь, BYN). "
        "Извлеки ВСЕ поля формы, которые можно уверенно определить из текста. "
        "Используй только поля из схемы — атрибут field (name) должен совпадать точно. "
        "Правила:\n"
        "- Сумма: число без валюты, точка как десятичный разделитель (2100.00).\n"
        "- УНП: 9 цифр.\n"
        "- Счёт получателя: IBAN BY + 26 символов, если есть в тексте.\n"
        "- Дата документа: DD.MM.YYYY.\n"
        "- Назначение платежа: полная фраза из документа.\n"
        "- Получатель: наименование организации или ФИО, не путать с плательщиком.\n"
        "- Не выдумывай значения — пропускай поле, если его нет в тексте.\n"
        f"- Заполняй по возможности все ключи: {field_keys}.\n\n"
        f"{schema_field_summary(schema)}"
    )

    user = (
        "Распознанный текст с фото платёжного документа:\n\n"
        f"{text.strip()}\n\n"
        "Верни fill_payment_form со всеми найденными полями."
    )

    try:
        client = _llm_client()
        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            tools=[FILL_TOOL],
            tool_choice={"type": "function", "function": {"name": "fill_payment_form"}},
            temperature=0.1,
        )
        ai_msg = resp.choices[0].message
        if not ai_msg.tool_calls:
            return None

        args = json.loads(ai_msg.tool_calls[0].function.arguments)
        raw = [
            FormFieldAction(
                field=str(f["field"]),
                value=str(f["value"]),
                label=f.get("label"),
            )
            for f in args.get("fields", [])
            if f.get("field") and f.get("value")
        ]
        validated = _validate_actions(raw, schema)
        return validated or None
    except Exception:
        logger.exception("OCR LLM parse failed")
        return None
