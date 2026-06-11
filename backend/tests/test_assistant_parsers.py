"""Unit tests for parsers/routers used by the AI assistant (no DB required).

Run from the backend/ directory:
    python -m pytest tests/test_assistant_parsers.py
    # or, without pytest:
    python tests/test_assistant_parsers.py
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.banking import queries as q
from services.banking import search as s
from services.forms import payment_validators as pv


# ─── Search: amount parsing ───────────────────────────────────────────────────

def test_year_is_not_amount():
    # «за март 2026» — год не должен трактоваться как сумма
    assert s._parse_amount("Найди счёт от ООО Ромашка за март 2026") is None


def test_amount_with_spaces():
    assert s._parse_amount("Найди платёж на 50 000 от Иванова") == 50000.0


def test_amount_labeled_year_with_keyword():
    # год трактуется как сумма только при явном указании (руб/byn/сумма/на N)
    assert s._parse_amount("на 2026 byn") == 2026.0


def test_search_terms_drop_stopwords():
    terms = s._search_terms("найди счёт от ооо ромашка за март 2026")
    assert "ромашка" in terms
    for stop in ("найди", "счёт", "ооо", "март"):
        # стоп-слова и цифры выкидываются (март — месяц, не стоп-слово, но проверим базовые)
        if stop in ("найди", "счёт", "ооо"):
            assert stop not in terms


def test_match_variants_handles_cases():
    # «Иванова» (родительный) должен давать стем «Иванов»
    variants = s._match_variants("иванова")
    assert "иванов" in variants
    # короткие токены не дробятся слишком сильно
    assert s._match_variants("бета") == ["бета"]


def test_month_year_parsing():
    month, year = s._parse_month_year("выписка за март 2026")
    assert month == "03"
    assert year == "2026"


# ─── Search: response formatting (edge cases) ─────────────────────────────────

def test_empty_search_gives_hints():
    text, sources = s.format_search_response("найди платёж за март на 999999", [])
    assert sources == []
    assert "ничего не найдено" in text.lower()
    assert "попробуйте" in text.lower()


def test_multiple_payments_numbered_list():
    hits = [
        s.SearchHit("payment", "1", "№1 — ИП Иванов", "оплата", 100.0, "BYN", "Проведен", "/x"),
        s.SearchHit("payment", "2", "№2 — ИП Иванов", "оплата", 200.0, "BYN", "Проведен", "/y"),
    ]
    text, sources = s.format_search_response("платежи иванова", hits)
    assert "1." in text and "2." in text
    assert len(sources) == 2


def test_single_counterparty_card():
    hits = [s.SearchHit("counterparty", "cp1", "ИП Петров П.П.", "УНП 193456789", None, None, None, "/services/counterparty?cp=cp1")]
    text, sources = s.format_search_response("покажи карточку клиента петров", hits)
    assert "петров" in text.lower()
    assert sources[0]["url"] == "/services/counterparty?cp=cp1"


# ─── Router intents ───────────────────────────────────────────────────────────

def test_is_search_query_variants():
    assert q.is_search_query("Найди счёт от ООО Ромашка")
    assert q.is_search_query("покажи карточку контрагента Петров")
    assert q.is_search_query("открой карточку клиента")
    assert not q.is_search_query("сколько на счёте?")


def test_open_counterparty_intent():
    assert q.is_open_counterparty_query("Покажи карточку клиента Петров")
    assert q.is_open_counterparty_query("открой контрагента Ромашка")
    assert not q.is_open_counterparty_query("создай платёж на 100")


def test_payments_by_name_intent():
    assert q.is_payments_by_name_query("Платежи Иванова за март")
    assert q.is_payments_by_name_query("переводы ООО Ромашка")
    # не должно срабатывать на «последний платёж» / «создай платёжку»
    assert not q.is_payments_by_name_query("повтори последний платёж")
    assert not q.is_payments_by_name_query("создай платёжку на 100 для Ромашки")
    # одного периода без имени недостаточно
    assert not q.is_payments_by_name_query("платежи за март")


def test_statement_period_from_text():
    assert q._statement_period_from_text("выписка за квартал")[0] == "quarter"
    assert q._statement_period_from_text("выписка за год")[0] == "year"
    assert q._statement_period_from_text("выписка за апрель 2026")[0] == "2026-04"


def test_balance_intent_typos():
    assert q.is_balance_query("сколько на счете")
    assert q.is_balance_query("какой остаток?")


def test_balance_intent_handles_yo_and_full_phrase():
    """«Сколько на счёте?» должно попадать в balance-handler (ё и суффикс -е)."""
    assert q.is_balance_query("Сколько на счёте?")
    assert q.is_balance_query("сколько на счёте")
    assert q.is_balance_query("сколько денег на счёте")
    # отрицательные кейсы: не должно ложно срабатывать
    assert not q.is_balance_query("сколько стоит подписка")
    assert not q.is_balance_query("создай платёжку на 100")
    # search-регекс по-прежнему не считает это поиском
    assert not q.is_search_query("сколько на счёте?")


def test_build_search_payload_navigates_single_hit():
    hit = s.SearchHit("counterparty", "cp1", "ИП Петров", "УНП", None, None, None, "/services/counterparty?cp=cp1")
    sources = [{"index": 1, "label": "x", "kind": "counterparty", "id": "cp1", "url": "/services/counterparty?cp=cp1"}]
    payload = q._build_search_payload("покажи петрова", [hit], sources, "Карточка")
    assert payload["ui_actions"][0]["type"] == "navigate"
    assert payload["ui_actions"][0]["target"] == "/services/counterparty?cp=cp1"


def test_build_search_payload_empty_has_chips():
    payload = q._build_search_payload("найди ничего", [], [], "ничего не найдено")
    assert payload.get("suggested_chips")
    assert "ui_actions" not in payload


# ─── Payment validators ───────────────────────────────────────────────────────

def test_validate_unp():
    assert pv.validate_unp("123456789").level == "ok"
    assert pv.validate_unp("12345").level == "error"
    assert pv.validate_unp("").level == "error"


def test_validate_iban_format_and_bank():
    bad = pv.validate_iban("BY00")
    assert bad.level == "error"
    bank = pv.bank_from_iban("BY13 BPSB 3012 1111 1111 1111 1111")
    assert bank is not None
    assert bank[0] == "BPSBBY2X"


def test_validate_amount_limit():
    assert pv.validate_amount(100.0, 5000.0).level == "ok"
    assert pv.validate_amount(9000.0, 5000.0).level == "warn"
    assert pv.validate_amount(0.0).level == "error"


def test_validate_purpose():
    assert pv.validate_purpose("").level == "warn"
    assert pv.validate_purpose("Оплата по договору №45").level == "ok"


def test_validate_exec_date_weekend():
    # 2026-06-06 — суббота
    h = pv.validate_exec_date("06.06.2026")
    assert h.level == "warn"
    # 2026-06-08 — понедельник
    assert pv.validate_exec_date("08.06.2026").level == "ok"


def test_validate_currency_residency():
    assert pv.validate_currency_residency("BYN", "BY") is None
    assert pv.validate_currency_residency("USD", "BY").level == "warn"


def test_hints_unp_resolves_name():
    hints = pv.hints_for_payment(unp="123456789", counterparty_name='ООО "Ромашка"')
    unp_hint = next(h for h in hints if h.field == "unp")
    assert "Ромашка" in unp_hint.message


def test_has_critical_error():
    hints = pv.hints_for_payment(unp="123", iban="", amount=100.0, purpose="оплата по договору")
    assert pv.has_critical_error(hints)


def test_insurance_reply_handler_is_sync():
    """Regression: awaiting sync _maybe_insurance_reply caused HTTP 500 on chat."""
    import inspect

    from services.ai.assistant import AssistantService

    assert not inspect.iscoroutinefunction(AssistantService._maybe_insurance_reply)


# ─── Document journal commands ────────────────────────────────────────────────

def test_doc_period_month_name_range():
    period = q.parse_doc_period("Открой все документы с февраля по май")
    assert period.get("date_from") == "01.02.2026"
    assert period.get("date_to") == "31.05.2026"


def test_is_banking_document_command():
    assert q.is_banking_document_command("Открой все документы с февраля по май")
    assert q.is_banking_document_command("Открой все документы с суммой от 50 руб")
    assert q.is_banking_document_command("Открой все документы с контрагентом ООО ромашка")
    assert q.is_banking_document_command("Открой документ номер 97")
    assert q.is_banking_document_command("открой документы на подпись")
    assert q.is_banking_document_command(
        "открой документы на подписи от 02.06.2026 до 03.06.2026"
    )
    assert q.is_banking_document_command("сумма от 300", page_route="/other/documents")
    assert not q.is_banking_document_command("создай платёж на 100")
    assert not q.is_banking_document_command("сумма от 300")


def test_doc_period_open_day_month():
    period = q.parse_doc_period("открой документы на подписи от 2 июня")
    assert period.get("date_from") == "02.06.2026"


def test_match_demo_route_skips_banking_document_list():
    from services.navigation.demo_routes import match_demo_route

    assert match_demo_route("открой документы на подпись") is None
    assert match_demo_route("открой документы на подписи от 2 июня") is None


def test_page_actions_skip_banking_document_commands():
    from services.ui.page_actions import _match_action

    route = "/other/documents"
    assert _match_action("Открой все документы с февраля по май", route) is None
    assert _match_action("Открой все документы с суммой от 50 руб", route) is None
    assert _match_action("Открой документ номер 97", route) is None


def test_parse_doc_number_from_open_command():
    assert s._parse_doc_number("Открой документ номер 97") == "97"


# ─── OCR photo payment help ───────────────────────────────────────────────────

def test_ocr_photo_payment_intent_detected():
    from services.ai.assistant import _wants_ocr_photo_payment_help

    assert _wants_ocr_photo_payment_help("Помоги заполнить платёж по фото счёта")
    assert _wants_ocr_photo_payment_help("сканируй счёт и заполни платёж")
    assert not _wants_ocr_photo_payment_help("найди платёж за март")


def test_ocr_photo_payment_navigates_to_instant():
    from services.ai.assistant import _ocr_photo_payment_reply

    resp = _ocr_photo_payment_reply("sess-1")
    assert "мгновенн" in resp.message.lower()
    assert "иконку камеры" in resp.message.lower()
    assert resp.ui_actions
    assert resp.ui_actions[0].target == "/payments/instant"


def test_payment_hints_read_filled_by_field_name():
    from services.ai.assistant import _payment_hints_from_state
    from services.ai.form_schemas import load_form_schema

    schema = load_form_schema("instant")
    filled = {
        "forms.INSTANT_PAYMENT_ORDER.CONTRAGENT_ID": "Федя",
        "forms.INSTANT_PAYMENT_ORDER.COMMON_COLUMNS_AMOUNT": "1500",
        "forms.INSTANT_PAYMENT_ORDER.PAYMENT_PURPOSE": "тест",
        "forms.INSTANT_PAYMENT_ORDER.COMMON_COLUMNS_CUSTOMER_ACCOUNT": "крутой",
    }
    hints = _payment_hints_from_state(filled, schema=schema)
    assert hints
    assert "🟡" in hints or "🟢" in hints


def test_ocr_photo_payment_on_form_page_no_navigate():
    from services.ai.assistant import _ocr_photo_payment_reply

    resp = _ocr_photo_payment_reply("sess-1", form_type="instant")
    assert resp.ui_actions is None
    assert "иконку камеры" in resp.message.lower()


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception as exc:  # noqa: BLE001
                failures += 1
                print(f"FAIL {name}: {exc}")
    print(f"\n{'OK' if failures == 0 else f'{failures} FAILURES'}")
    sys.exit(1 if failures else 0)
