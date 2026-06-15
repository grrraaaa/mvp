"""Load SBBOL payment form field schemas for AI form-fill."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

SCHEMA_DIR = Path(__file__).resolve().parents[3] / "frontend" / "lib" / "sbbol" / "formSchemas"

FORM_TYPE_ALIASES = {
    "paydocby": "paydocby",
    "paydocbyn": "paydocby",
    "instant": "instant",
    "instant_payment_order": "instant",
    "paydoccur": "paydoccur",
}

# Fields excluded from conversational fill (duplicate UI, radios, etc.)
SKIP_FILL_KEYS = frozenset({"PAYMENT_INDICATION"})

# Parsed on request but not required for «все основные поля заполнены»
OPTIONAL_FILL_KEYS = frozenset({"PAYMENT_PURPOSE_CATEGORY", "PAYMENT_PURPOSE_CODE"})


@lru_cache(maxsize=8)
def load_form_schema(form_type: str) -> Optional[dict[str, Any]]:
    key = FORM_TYPE_ALIASES.get(form_type.lower())
    if not key:
        return None
    path = SCHEMA_DIR / f"{key}.json"
    if not path.is_file():
        return None
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def schema_field_summary(schema: dict[str, Any]) -> str:
    lines = [f"Форма: {schema.get('title', schema.get('formName', ''))}"]
    for field in schema.get("fields", []):
        aliases = field.get("aliases") or []
        alias_str = f" (синонимы: {', '.join(aliases)})" if aliases else ""
        lines.append(f"- {field['key']}: {field.get('label', field['key'])}{alias_str} → name=\"{field['name']}\"")
    return "\n".join(lines)


def fillable_fields(schema: dict[str, Any]) -> list[dict[str, Any]]:
    fields = []
    for field in schema.get("fields", []):
        if field.get("key") in SKIP_FILL_KEYS:
            continue
        if field.get("type") in ("radio", "checkbox"):
            continue
        fields.append(field)
    return sorted(fields, key=lambda f: f.get("fillPriority", 99))


def required_fillable_fields(schema: dict[str, Any]) -> list[dict[str, Any]]:
    return [f for f in fillable_fields(schema) if f.get("key") not in OPTIONAL_FILL_KEYS]


def field_by_key(schema: dict[str, Any], key: str) -> Optional[dict[str, Any]]:
    for field in schema.get("fields", []):
        if field.get("key") == key:
            return field
    return None


def field_labels_for_keys(schema: dict[str, Any], keys: list[str]) -> list[str]:
    labels: list[str] = []
    for key in keys:
        meta = field_by_key(schema, key)
        if meta:
            labels.append(meta.get("label") or key)
    return labels
