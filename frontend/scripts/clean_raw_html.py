#!/usr/bin/env python3
"""Clean captured SBBOL HTML fragments for static rendering."""
from __future__ import annotations

import re
from pathlib import Path

RAW_DIR = Path(__file__).resolve().parents[1] / "lib" / "sbbol" / "raw-html"

# Full-page payment form captures: keep <main> — demoPageHtml extracts the form fragment at runtime.
SKIP_MAIN_STRIP = frozenset(
    {"payments-paydocbyn.html", "payments-instant.html", "payments-paydoccur.html"}
)


def normalize_paths(html: str) -> str:
    html = html.replace("/sber-orig/css/main.bundle.css", "/sber-orig/static/main.bundle.css")
    html = html.replace("/sber-orig/css/fonts.css", "/sber-orig/static/fonts/fonts.css")
    html = re.sub(
        r'href="(?:https?://[^"]+)?/?static/([^"]+\.css)"',
        r'href="/sber-orig/static/\1"',
        html,
    )
    html = re.sub(
        r'src="(?:https?://[^"]+)?/?static/([^"]+)"',
        r'src="/sber-orig/static/\1"',
        html,
    )
    return html


def sanitize(html: str, *, strip_main: bool = True) -> str:
    html = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", "", html, flags=re.I)
    html = re.sub(r"<noscript\b[^>]*>[\s\S]*?</noscript>", "", html, flags=re.I)
    html = re.sub(r'<iframe\b[^>]*>[\s\S]*?</iframe>', "", html, flags=re.I)
    html = re.sub(r'<img\b[^>]*src="/sber-orig/(?:0|f|J)"[^>]*>', "", html, flags=re.I)
    # Chat widget shell from full-page captures
    html = re.sub(
        r'<div style="z-index:\s*19000[^"]*">[\s\S]*?Чат с банком[\s\S]*?</div></div></div>',
        "",
        html,
        flags=re.I,
    )
    if strip_main:
        html = re.sub(r"<main id=\"app\" class=\"main-app\">[\s\S]*?</main>", "", html, flags=re.I)
    return normalize_paths(html.strip())


def main() -> None:
    for path in RAW_DIR.glob("*.html"):
        original = path.read_text(encoding="utf-8")
        cleaned = sanitize(original, strip_main=path.name not in SKIP_MAIN_STRIP)
        if cleaned != original:
            path.write_text(cleaned, encoding="utf-8")
            print(f"cleaned {path.name}")


if __name__ == "__main__":
    main()
