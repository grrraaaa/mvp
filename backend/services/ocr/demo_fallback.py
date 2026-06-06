"""Demo OCR fallback when ImageToText keys are missing."""
from __future__ import annotations

import hashlib
import re

DEMO_INVOICE_TEXT = """
СЧЁТ НА ОПЛАТУ № 247 от 05.06.2026
Поставщик: ООО "Ромашка"
УНП: 190123456
Р/с: BY13BPSB30121111111111111111
Банк: БПС-Сбербанк, BIC BPSBBY2X

Покупатель: DEMO ЮРИДИЧЕСКОЕ ЛИЦО

Наименование: Канцтовары и расходные материалы
Сумма: 2 100,00 BYN
Назначение платежа: Оплата по счёту №247 от 05.06.2026 за канцтовары
"""

DEMO_INVOICE_ALT = """
Платёжное поручение
Получатель: ООО БелТелесистемы
УНП 190823432
Счёт BY55BPSB30127777777777777777
Сумма 890.00 BYN
Назначение: Оплата интернета и телефонии за июнь 2026
"""


def demo_ocr_from_image_b64(b64: str) -> tuple[str, bool]:
    """Return (text, needs_confirmation). Pick variant by hash for variety."""
    digest = hashlib.md5(b64[:2000].encode()).hexdigest()
    text = DEMO_INVOICE_ALT if int(digest[:2], 16) % 2 else DEMO_INVOICE_TEXT
    return text.strip(), True


def is_pdf_data_url(data: str) -> bool:
    return bool(re.match(r"data:application/pdf", data.strip(), re.I))
