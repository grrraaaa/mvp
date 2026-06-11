"""Tests for navigation routing — verify form-fill messages don't open sections."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.navigation.demo_routes import match_demo_route, is_navigation_message


def test_contragent_in_form_should_not_navigate():
    # «наименование контрагента ООО Ромашка» → NOT navigation (form fill)
    assert match_demo_route("наименование контрагента ООО Ромашка") is None
    assert is_navigation_message("наименование контрагента ООО Ромашка") is False


def test_contragent_with_verb_should_navigate():
    # «открой контрагентов» → navigation to /payments/counterparties
    assert match_demo_route("открой контрагентов") == "/payments/counterparties"
    assert is_navigation_message("открой контрагентов") is True


def test_contragent_plural_with_verb():
    assert match_demo_route("перейди в контрагенты") == "/payments/counterparties"


def test_contragent_genitive_with_verb():
    assert match_demo_route("покажи список контрагента") == "/payments/counterparties"


def test_url_still_navigates_without_verb():
    # URL paths should still match even without verb
    assert match_demo_route("/payments/counterparties") == "/payments/counterparties"


def test_other_navigation_still_works():
    assert match_demo_route("покажи кредиты") == "/products/credits"
    assert match_demo_route("перейди в настройки") == "/settings"


def test_statement_period_not_demo_navigation():
    assert match_demo_route("выписка за сегодня") is None
    assert match_demo_route("покажи выписку за месяц") is None
    assert not is_navigation_message("выписка за сегодня")


if __name__ == "__main__":
    for fn in [
        test_contragent_in_form_should_not_navigate,
        test_contragent_with_verb_should_navigate,
        test_contragent_plural_with_verb,
        test_contragent_genitive_with_verb,
        test_url_still_navigates_without_verb,
        test_other_navigation_still_works,
    ]:
        try:
            fn()
            print(f"PASS  {fn.__name__}")
        except AssertionError as e:
            print(f"FAIL  {fn.__name__}: {e}")
        except Exception as e:
            print(f"ERROR {fn.__name__}: {e}")
