"""Official knowledge sources for tax, legal and social insurance Q&A."""
from __future__ import annotations

import re
from typing import List

from models.schemas import SourceRef

KNOWLEDGE_SOURCES: list[dict[str, str]] = [
    {
        "id": "nalog",
        "label": "nalog.gov.by",
        "title": "МНС РБ",
        "url": "https://www.nalog.gov.by/",
        "role": "основной",
        "description": "официальные ставки, сроки, формы деклараций",
    },
    {
        "id": "minfin",
        "label": "minfin.gov.by",
        "title": "Минфин РБ",
        "url": "https://www.minfin.gov.by/",
        "role": "дополнительно",
        "description": "разъяснения Минфина, письма и комментарии",
    },
    {
        "id": "pravo",
        "label": "pravo.by",
        "title": "Национальный правовой интернет-портал",
        "url": "https://pravo.by/",
        "role": "дополнительно",
        "description": "Налоговый кодекс РБ в актуальной редакции",
    },
    {
        "id": "ssf",
        "label": "ssf.gov.by",
        "title": "ФСЗН",
        "url": "https://www.ssf.gov.by/",
        "role": "дополнительно",
        "description": "ставки и сроки взносов в ФСЗН",
    },
    {
        "id": "bgs",
        "label": "bgs.by",
        "title": "Белгосстрах",
        "url": "https://www.bgs.by/",
        "role": "дополнительно",
        "description": "тарифы Белгосстраха",
    },
]

SOURCE_BY_ID = {item["id"]: item for item in KNOWLEDGE_SOURCES}

KNOWLEDGE_SOURCES_PROMPT = """
Источники знаний (обязательно ссылайся при ответах про налоги, отчётность, ФСЗН, законодательство, страховые взносы):
1. **Основной: [nalog.gov.by](https://www.nalog.gov.by/)** — официальные ставки, сроки, формы деклараций
2. **Дополнительно: [minfin.gov.by](https://www.minfin.gov.by/)** — разъяснения Минфина, письма и комментарии
3. **Дополнительно: [pravo.by](https://pravo.by/)** — Налоговый кодекс РБ в актуальной редакции
4. **Дополнительно: [ssf.gov.by](https://www.ssf.gov.by/)** — ставки и сроки взносов в ФСЗН
5. **Дополнительно: [bgs.by](https://www.bgs.by/)** — тарифы Белгосстраха

Правила ответов на вопросы:
- Отвечай на вопросы пользователя развёрнуто и по существу (не только навигация по банку).
- По налогам, срокам, ставкам, декларациям, ФСЗН и Белгосстраху опирайся на источники выше.
- В конце ответа добавь блок **Источники:** со ссылками на 1–3 релевантных сайта (markdown).
- Если точной цифры/срока нет в общеизвестных нормах — скажи об этом и направь на nalog.gov.by или ssf.gov.by.
- Не выдумывай ставки и даты — лучше дать порядок действий и ссылку на официальный источник.
- Для вопросов про банковские операции дополнительно указывай раздел SBBOL (/payments, /salary и т.д.).
- После ответа вызови функцию cite_knowledge_sources с id использованных источников: nalog, minfin, pravo, ssf, bgs.
"""

CITE_SOURCES_TOOL = {
    "type": "function",
    "function": {
        "name": "cite_knowledge_sources",
        "description": (
            "Указать официальные источники знаний, на которые опирается ответ. "
            "Вызывай после каждого ответа на вопрос про налоги, законодательство, ФСЗН или страховые взносы."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "source_ids": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["nalog", "minfin", "pravo", "ssf", "bgs"],
                    },
                    "description": "ID источников, упомянутых или использованных в ответе",
                },
            },
            "required": ["source_ids"],
        },
    },
}

_COMMAND_PREFIX = re.compile(
    r"^(?:найди|покажи|открой|создай|заполни|перейди|выписк|сформируй|загрузи|отправь|исправь)\b",
    re.I,
)
_KNOWLEDGE_TOPIC = re.compile(
    r"налог|ндс|подоходн|декларац|отч[её]тност|фсзн|взнос|соцстрах|белгосстрах|"
    r"кодекс|минфин|ставк|срок|обязательн|упрощен|ен|патент|страхов",
    re.I,
)
_QUESTION_MARKER = re.compile(
    r"\?|^(?:как|когда|какой|какая|какие|сколько|что|где|зачем|почему|"
    r"нужно\s+ли|можно\s+ли|объясни|расскаж|подскаж|уточни|каков)",
    re.I,
)


def is_knowledge_question(message: str) -> bool:
    """General Q&A about taxes/law/social insurance — prefer LLM with official sources."""
    text = (message or "").strip()
    if not text or _COMMAND_PREFIX.search(text):
        return False
    return bool(_KNOWLEDGE_TOPIC.search(text) and _QUESTION_MARKER.search(text))


def sources_from_ids(source_ids: list[str]) -> List[SourceRef]:
    refs: List[SourceRef] = []
    seen: set[str] = set()
    for raw_id in source_ids:
        item = SOURCE_BY_ID.get(raw_id)
        if not item or raw_id in seen:
            continue
        seen.add(raw_id)
        refs.append(
            SourceRef(
                index=len(refs) + 1,
                label=f"Источник {len(refs) + 1}: {item['label']} — {item['description']}",
                kind="knowledge",
                url=item["url"],
            )
        )
    return refs


def default_sources_for_message(message: str) -> List[SourceRef]:
    """Fallback chips when LLM answered but did not call cite_knowledge_sources."""
    low = message.lower()
    ids: list[str] = []
    if re.search(r"фсзн|взнос|соц", low):
        ids.append("ssf")
    if re.search(r"белгосстрах|страх", low):
        ids.append("bgs")
    if re.search(r"кодекс|закон|стать", low):
        ids.append("pravo")
    if re.search(r"минфин|разъясн", low):
        ids.append("minfin")
    if re.search(r"налог|ндс|декларац|отч[её]т", low) or not ids:
        ids.insert(0, "nalog")
    # dedupe preserving order
    ordered: list[str] = []
    for sid in ids:
        if sid not in ordered:
            ordered.append(sid)
    return sources_from_ids(ordered[:3])
