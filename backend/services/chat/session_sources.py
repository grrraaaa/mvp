"""Per-session source registry — maps «Источник №N» to actual DB records."""
from __future__ import annotations

from typing import Any

_SESSION_SOURCES: dict[str, list[dict[str, Any]]] = {}


def register_sources(session_id: str, sources: list[dict[str, Any]] | None) -> None:
    if not session_id or not sources:
        return
    normalized = []
    for s in sources:
        normalized.append(
            {
                "index": s.get("index"),
                "label": s.get("label", ""),
                "kind": s.get("kind", "document"),
                "id": s.get("id"),
                "url": s.get("url"),
                "highlight_fields": s.get("highlight_fields") or [],
            }
        )
    _SESSION_SOURCES[session_id] = normalized


def get_source(session_id: str, index: int) -> dict[str, Any] | None:
    for s in _SESSION_SOURCES.get(session_id, []):
        if s.get("index") == index:
            return s
    return None


def get_all_sources(session_id: str) -> list[dict[str, Any]]:
    return list(_SESSION_SOURCES.get(session_id, []))
