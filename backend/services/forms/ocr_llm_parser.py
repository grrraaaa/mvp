"""Extract payment form fields from OCR text via OpenAI / OpenRouter.

Поддерживает две стратегии:
  1) function calling (tools) — для моделей, которые это умеют (gpt-4o, mistral-large, и т.п.);
  2) plain JSON в content — fallback для дешёвых/бесплатных моделей OpenRouter
     (большинство из них function calling не поддерживают или поддерживают криво).

Если оба способа не дали полей — возвращаем None, дальше сработает rule-based
fallback в ocr_text_parser.
"""
from __future__ import annotations

import json
import logging
import re
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


def _extract_json_from_content(raw: str) -> Optional[dict]:
    """Вытащить JSON-объект из свободного ответа LLM (с markdown-обёрткой или без)."""
    if not raw:
        return None
    # Снимем ```json ... ``` если есть.
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.S | re.I)
    if m:
        candidate = m.group(1)
    else:
        # Возьмём от первой { до последней } — на случай, если модель добавила
        # текст до/после JSON.
        start = raw.find("{")
        end = raw.rfind("}")
        if start < 0 or end <= start:
            return None
        candidate = raw[start : end + 1]
    try:
        obj = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    return obj if isinstance(obj, dict) else None


def _coerce_fields_payload(obj: dict) -> List[dict]:
    """Поддержать оба формата: {"fields": [...]} и сразу [...]."""
    if isinstance(obj.get("fields"), list):
        return [f for f in obj["fields"] if isinstance(f, dict)]
    # Иногда модель сразу возвращает список полей.
    if "field" in obj and "value" in obj:
        return [obj]
    return []


def _parse_with_tool_calls(
    ai_msg, schema: dict
) -> Optional[List[FormFieldAction]]:
    """Стратегия 1: function calling через tools/tool_calls."""
    if not getattr(ai_msg, "tool_calls", None):
        return None
    try:
        args = json.loads(ai_msg.tool_calls[0].function.arguments)
    except (json.JSONDecodeError, IndexError, AttributeError):
        return None
    fields = args.get("fields") if isinstance(args, dict) else None
    if not isinstance(fields, list):
        return None
    raw = [
        FormFieldAction(
            field=str(item["field"]),
            value=str(item["value"]),
            label=item.get("label"),
        )
        for item in fields
        if item.get("field") and item.get("value") is not None
    ]
    validated = _validate_actions(raw, schema)
    return validated or None


def _parse_with_content_json(
    content: str, schema: dict
) -> Optional[List[FormFieldAction]]:
    """Стратегия 2: парсим JSON прямо из content (для моделей без function_calling)."""
    obj = _extract_json_from_content(content or "")
    if not obj:
        return None
    fields = _coerce_fields_payload(obj)
    if not fields:
        return None
    raw = [
        FormFieldAction(
            field=str(item.get("field", "")).strip(),
            value=str(item.get("value", "")).strip(),
            label=item.get("label"),
        )
        for item in fields
        if item.get("field") and item.get("value") is not None
    ]
    validated = _validate_actions(raw, schema)
    return validated or None


async def parse_ocr_text_with_llm(text: str, form_type: str) -> Optional[List[FormFieldAction]]:
    """Use LLM to map OCR plain text to form field actions.

    Возвращает None, если модель не настроена / упала / не дала полей.
    Поддерживает оба способа ответа: tool_calls и JSON-в-content.
    """
    if not settings.OPENAI_API_KEY:
        return None

    schema = load_form_schema(form_type)
    if not schema:
        return None

    # Сокращённые инструкции: оставим только критичное — и для tool_calls,
    # и для JSON-в-content. Длинный field-format не нужен при первом проходе,
    # normalize_field_value всё равно его применит после.
    allowed_names = {f["name"] for f in fillable_fields(schema)}
    allowed_keys_hint = (
        "Разрешённые имена полей: "
        + ", ".join(sorted(allowed_names))
        + "."
    )

    system = (
        "Ты извлекаешь реквизиты из OCR-текста белорусского платёжного документа. "
        "Верни СТРОГО JSON вида {\"fields\": [{\"field\": \"<name>\", \"value\": \"<value>\"}, ...]} "
        "только для полей, которые можно уверенно определить из текста. "
        "Без markdown-обёрток, без пояснений. Получатель — поставщик/бенефициар из счёта. "
        f"{allowed_keys_hint}"
    )

    user = (
        "OCR-текст с фото:\n\n"
        f"{text.strip()[:4000]}\n\n"
        "Верни JSON."
    )

    try:
        client = _llm_client()
        # Сначала пробуем function_calling (gpt-4o, mistral-large, command-r, …).
        # Многие бесплатные модели OpenRouter tools не поддерживают — тогда
        # сработает fallback на JSON в content.
        try:
            resp = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                tools=[build_fill_tool(schema)],
                tool_choice={"type": "function", "function": {"name": "fill_payment_form"}},
                temperature=0,
                max_tokens=600,
            )
            ai_msg = resp.choices[0].message
            tool_result = _parse_with_tool_calls(ai_msg, schema)
            if tool_result:
                return tool_result
            # tool_calls пуст — пробуем content.
            content_result = _parse_with_content_json(
                getattr(ai_msg, "content", "") or "", schema
            )
            if content_result:
                return content_result
        except Exception as exc:
            # Некоторые провайдеры (free OpenRouter) валятся на tools/function_calling.
            # Делаем второй заход БЕЗ tools — модель ответит JSON в content.
            logger.debug("OCR LLM tool_call path failed, retrying without tools: %s", exc)
            try:
                resp = await client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    temperature=0,
                    max_tokens=600,
                )
                content = resp.choices[0].message.content or ""
                content_result = _parse_with_content_json(content, schema)
                if content_result:
                    return content_result
            except Exception as exc2:
                logger.warning("OCR LLM content-JSON path failed: %s", exc2)

        logger.info("OCR LLM parse: no fields extracted for form=%s", form_type)
        return None
    except Exception:
        logger.exception("OCR LLM parse failed")
        return None
