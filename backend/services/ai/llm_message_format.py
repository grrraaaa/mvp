"""Normalize LLM chat text before sending to the user."""
from __future__ import annotations

import re
from typing import List

from models.schemas import SourceRef
from services.ai.knowledge_sources import KNOWLEDGE_SOURCES

_META_LINE_RE = re.compile(
    r"^.*(?:зафиксирую источник|source_ids|cite_knowledge_sources|вызову функци|tool call).*$",
    re.I | re.M,
)
_CODE_BLOCK_RE = re.compile(r"```[\s\S]*?```", re.M)
_JSON_SOURCE_RE = re.compile(r"\{[^{}]*\"source_ids\"[^{}]*\}", re.I | re.S)
_TRAILING_SBOL_RE = re.compile(r"\n*Раздел СберБизнес\s*\n*/?\s*$", re.I)
_SOURCES_BLOCK_RE = re.compile(r"\n*\*{0,2}Источники:\*{0,2}[\s\S]*$", re.I)

_DOMAIN_TO_URL = {item["label"]: item["url"].rstrip("/") for item in KNOWLEDGE_SOURCES}
# Also map without www
for item in KNOWLEDGE_SOURCES:
    _DOMAIN_TO_URL[item["label"].replace("www.", "")] = item["url"].rstrip("/")


def _fix_broken_gov_urls(text: str) -> str:
    """Repair common LLM URL corruption like https:/.nalog.gov.by/."""
    result = text
    for domain, canonical in _DOMAIN_TO_URL.items():
        bare = domain.replace("www.", "")
        patterns = [
            rf"https?:(?:/+\.?|//)?{re.escape(bare)}[^\s\)\]]*",
            rf"https?://(?:www\.)?{re.escape(bare)}[^\s\)\]]*",
        ]
        for pattern in patterns:
            result = re.sub(pattern, canonical, result, flags=re.I)
        # Normalize markdown link targets for this domain
        result = re.sub(
            rf"\[([^\]]*{re.escape(bare)}[^\]]*)\]\([^)]+\)",
            rf"[\1]({canonical}/)" if not canonical.endswith("/") else rf"[\1]({canonical})",
            result,
            flags=re.I,
        )
    # pravo.by special case: https:/.by/
    result = re.sub(r"https?:(?:/+\.?|//)?by/?", "https://pravo.by/", result, flags=re.I)
    result = re.sub(
        r"\[pravo\.by\]\([^)]+\)",
        "[pravo.by](https://pravo.by/)",
        result,
        flags=re.I,
    )
    return result


def clean_llm_user_text(text: str) -> str:
    """Remove tool leakage, JSON, and meta instructions from assistant message."""
    cleaned = (text or "").strip()
    if not cleaned:
        return ""

    cleaned = _CODE_BLOCK_RE.sub("", cleaned)
    cleaned = _JSON_SOURCE_RE.sub("", cleaned)
    cleaned = _META_LINE_RE.sub("", cleaned)
    cleaned = _fix_broken_gov_urls(cleaned)
    cleaned = _TRAILING_SBOL_RE.sub("", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned


def strip_sources_section(text: str) -> str:
    """Remove LLM-generated sources block — backend adds canonical links."""
    return _SOURCES_BLOCK_RE.sub("", text).strip()


def build_sources_markdown(sources: List[SourceRef]) -> str:
    lines = ["**Источники:**"]
    for src in sources:
        url = (src.url or "").rstrip("/") + "/"
        # Extract domain from label: "Источник 1: nalog.gov.by — ..."
        label = src.label or ""
        domain = ""
        if ":" in label:
            tail = label.split(":", 1)[1].strip()
            domain = tail.split("—")[0].strip()
        if not domain and url:
            domain = url.replace("https://www.", "").replace("https://", "").rstrip("/")
        desc = ""
        if "—" in label:
            desc = label.split("—", 1)[1].strip()
        if desc:
            lines.append(f"- [{domain}]({url}) — {desc}")
        else:
            lines.append(f"- [{domain}]({url})")
    return "\n".join(lines)


def format_knowledge_answer(text: str, sources: List[SourceRef]) -> str:
    """Final user-facing message for tax/legal Q&A."""
    body = strip_sources_section(clean_llm_user_text(text))
    if not body:
        body = (
            "По налогам и отчётности в Беларуси ориентируйтесь на официальные публикации МНС и Минфина. "
            "Ниже — проверенные источники с актуальными ставками, сроками и формами."
        )
    if sources:
        body = f"{body}\n\n{build_sources_markdown(sources)}"
    return body.strip()


def canonical_markdown_links() -> str:
    """Reference list for the system prompt."""
    return "\n".join(
        f"- [{item['label']}]({item['url']}) — {item['description']}"
        for item in KNOWLEDGE_SOURCES
    )
