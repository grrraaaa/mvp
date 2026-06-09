"""Smoke-test for assistant intent detection and navigation."""
import sys
from pathlib import Path

BACKEND = Path(r"C:\Users\New\Desktop\sber\mvp\backend")
sys.path.insert(0, str(BACKEND))

print("=== Intent detection (assistant._detect_intent) ===")
from services.ai.assistant import _detect_intent

cases = [
    ("информационный запрос", "info_requests"),
    ("открой информационные запросы", "info_requests"),
    ("запрос информации по счету", "info_requests"),
    ("запрос выписки", "info_requests"),
    ("остаток по счету", "info_requests"),
    ("выписка по счёту", "statement"),
    ("открой платежи", "payments"),
    ("кредит для бизнеса", "credit"),
    ("квартальная выписка", "statement"),
    ("покажи выписку", "statement"),
    ("запрос остатков", "info_requests"),
    ("информационные запросы", "info_requests"),
]

ok = 0
for query, expected in cases:
    intent = _detect_intent(query)
    actual = intent["intent"] if intent else None
    mark = "OK" if actual == expected else "FAIL"
    if actual == expected:
        ok += 1
    print(f"  [{mark}] {query!r:45s} -> {actual!s:18s} (expected {expected!s})")
print(f"Intent: {ok}/{len(cases)} passed")

print()
print("=== Navigation match (demo_routes.match_demo_route) ===")
from services.navigation.demo_routes import match_demo_route

nav_cases = [
    ("информационный запрос", "/other/info-requests"),
    ("открой информационные запросы", "/other/info-requests"),
    ("запрос информации по счету", "/other/info-requests"),
    ("остаток по счету", "/other/info-requests"),
    ("открой платежи", "/payments"),
    ("выписка по счёту", "/statement"),
    ("создай платежное поручение", "/payments/paydocbyn"),
    ("мгновенный платёж", "/payments/instant"),
    ("перевод в инвалюте", "/payments/paydoccur"),
]

ok = 0
for query, expected in nav_cases:
    actual = match_demo_route(query)
    mark = "OK" if actual == expected else "FAIL"
    if actual == expected:
        ok += 1
    print(f"  [{mark}] {query!r:45s} -> {actual!s:25s} (expected {expected!s})")
print(f"Navigation: {ok}/{len(nav_cases)} passed")

print()
print("=== Section labels & response messages ===")
from services.sber_links import section_label, response_message, section_url

print(f"  section_label('info_requests') = {section_label('info_requests')!r}")
print(f"  section_url('info_requests')   = {section_url('info_requests')!r}")
print(f"  response_message('info_requests') (head) = {response_message('info_requests')[:120]!r}")
print(f"  response_message('statement') (head)     = {response_message('statement')[:120]!r}")

# Confirm that info_requests no longer falls into the default template
assert "Разделы интернет-банка" not in response_message("info_requests"), \
    "info_requests still falls into default template!"
assert "Запросы выписки" in response_message("info_requests") or "выписки" in response_message("info_requests"), \
    "info_requests template is missing info-specific wording!"
assert section_label("info_requests") != "СберБизнес", \
    "section_label(info_requests) is still the placeholder!"
print("All response checks passed.")
