#!/usr/bin/env python3
"""Extract raw HTML snippets from agent transcript into lib/sbbol/raw-html/."""
import json
import re
from pathlib import Path

TRANSCRIPT = Path(
    r"C:\Users\New\.cursor\projects\c-Users-New-Desktop-sber"
    r"/agent-transcripts/91dbc9b9-051d-409b-8732-a790ef00ffd7"
    r"/91dbc9b9-051d-409b-8732-a790ef00ffd7.jsonl"
)
OUT_DIR = Path(__file__).resolve().parents[1] / "lib" / "sbbol" / "raw-html"


def get_line(n: int) -> str | None:
    for i, line in enumerate(TRANSCRIPT.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        if i != n:
            continue
        obj = json.loads(line)
        text = obj["message"]["content"][0]["text"]
        if text.startswith("<user_query>"):
            text = text[len("<user_query>") :]
        if text.endswith("</user_query>"):
            text = text[: -len("</user_query>")]
        return text.strip()
    return None


def fix_asset_paths(html: str) -> str:
    html = re.sub(r'src="(?:https?://[^"]+)?/?(?:static/)?([^"]+)"', r'src="/sber-orig/\1"', html)
    html = re.sub(r'href="(?:https?://[^"]+)?/?(?:static/)?([^"]+\.css)"', r'href="/sber-orig/\1"', html)
    return html


def extract_balanced_div(html: str, start: int) -> str | None:
    depth = 0
    i = start
    while i < len(html):
        if html.startswith("<div", i):
            depth += 1
            i += 4
            continue
        if html.startswith("</div>", i):
            depth -= 1
            i += 6
            if depth == 0:
                return html[start:i]
            continue
        i += 1
    return None


def extract_modal_only(html: str) -> str:
    marker = 'data-name="DocumentTypesModal"'
    pos = html.find(marker)
    if pos == -1:
        raise ValueError("DocumentTypesModal not found")
    start = html.rfind("<div", 0, pos)
    block = extract_balanced_div(html, start)
    if not block:
        raise ValueError("Could not extract modal div")
    return block


def extract_form_by_title(html: str, title_fragment: str) -> str | None:
    pos = html.find(title_fragment)
    if pos == -1:
        return None
    # Walk back to a page-level container
    for marker in [
        "DocumentForm-container",
        "DocumentFormPage",
        "FormPage-container",
        "Document-page",
        "documentPage",
        "DocumentForm",
    ]:
        back = html.rfind(marker, 0, pos)
        if back != -1 and pos - back < 80000:
            start = html.rfind("<div", 0, back)
            block = extract_balanced_div(html, start)
            if block and len(block) > 500:
                return block
    start = html.rfind("<div", 0, pos)
    return extract_balanced_div(html, start)


def split_html_pages(blob: str) -> list[str]:
    pages: list[str] = []
    for m in re.finditer(r"<html[\s>]", blob, re.IGNORECASE):
        start = m.start()
        end = blob.lower().find("</html>", start)
        if end == -1:
            continue
        pages.append(blob[start : end + len("</html>")])
    return pages


def extract_body_fragment(full_html: str) -> str:
    """Keep #root / main app content from captured page."""
    for marker in ['id="root"', 'id="app"', "data-name=\"DocumentForm"]:
        pos = full_html.find(marker)
        if pos != -1:
            start = full_html.rfind("<div", 0, pos)
            block = extract_balanced_div(full_html, start)
            if block:
                return block
    m = re.search(r"<body[^>]*>(.*)</body>", full_html, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return full_html


def classify_page(html: str) -> str | None:
    checks = [
        ("paydocbyn", "PAYDOCBY"),
        ("paydocbyn", "Платежное поручение (BYN)"),
        ("instant", "INSTANT_PAYMENT_ORDER"),
        ("instant", "Мгновенный платеж (BYN)"),
        ("paydoccur", "PAYDOCCUR"),
        ("paydoccur", "Перевод инвалюты внутри РБ"),
    ]
    for key, needle in checks:
        if needle in html:
            return key
    return None


def extract_form_by_name(html: str, name: str) -> str | None:
    for pat in [f'name="{name}"', f"data-name=\"{name}\""]:
        m = re.search(pat, html)
        if m:
            return extract_form_by_title(html, m.group(0))
    return None


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Modal from line 364 (modal + forms concatenated)
    blob364 = get_line(364)
    if not blob364:
        raise SystemExit("Line 364 missing")

    modal = extract_modal_only(blob364)
    (OUT_DIR / "document-types-modal.html").write_text(fix_asset_paths(modal), encoding="utf-8")
    print("modal:", len(modal))

    file_map = {
        "paydocbyn": "payments-paydocbyn.html",
        "instant": "payments-instant.html",
        "paydoccur": "payments-paydoccur.html",
    }
    found: dict[str, str] = {}

    for line_no in [364, 365, 325, 348]:
        text = get_line(line_no)
        if not text:
            continue
        pages = split_html_pages(text)
        print(f"line {line_no}: {len(pages)} html pages")
        for page in pages:
            kind = classify_page(page)
            if not kind or kind in found:
                continue
            body = extract_body_fragment(page)
            found[kind] = body
            print(f"  -> {kind} len={len(body)}")

    for kind, fname in file_map.items():
        if kind not in found:
            print("WARN: missing", fname)
            continue
        (OUT_DIR / fname).write_text(fix_asset_paths(found[kind]), encoding="utf-8")


def inspect() -> None:
    text = get_line(364)
    if not text:
        return
    modal = extract_modal_only(text)
    print("modal end at", text.find(modal) + len(modal) if modal else None)
    tail = text[len(modal) :] if modal else text
    print("tail len", len(tail))
    print("tail start:", tail[:500].replace("\n", " "))
    for s in ["<html", "DocumentForm", "FormPage", "PAYDOCBY", "Платежное поручение"]:
        print(s, tail.find(s))


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "inspect":
        inspect()
    else:
        main()
