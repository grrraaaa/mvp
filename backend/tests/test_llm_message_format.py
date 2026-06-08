"""Tests for LLM answer normalization."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.ai.knowledge_sources import default_sources_for_message, is_knowledge_question
from services.ai.llm_message_format import clean_llm_user_text, format_knowledge_answer

SAMPLE_BAD = """
Посетите [nalog.gov.by](https:/.nalog.gov.by/) для информации.
**Источники:**
- [nalog.gov.by](https:/.nalog.gov.by/)
- [minfin.gov.by](https:/.minfin.gov.by/)
После этого я зафиксирую источники:
```json
{"source_ids":["nalog","minfin","pravo"]}
```
Раздел СберБизнес /
"""


def test_knowledge_topic_short_query():
    assert is_knowledge_question("налоги 2026")


def test_clean_removes_json_and_meta():
    cleaned = clean_llm_user_text(SAMPLE_BAD)
    assert "source_ids" not in cleaned
    assert "зафиксирую" not in cleaned
    assert "Раздел СберБизнес" not in cleaned


def test_format_adds_canonical_sources():
    sources = default_sources_for_message("налоги 2026")
    out = format_knowledge_answer(SAMPLE_BAD, sources)
    assert "https://www.nalog.gov.by/" in out
    assert "**Источники:**" in out
    assert "```" not in out


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"PASS {name}")
