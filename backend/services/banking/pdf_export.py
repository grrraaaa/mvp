"""Генерация PDF для банковских документов (fpdf2, кириллица через DejaVu).

Используется эндпоинтом GET /api/banking/documents/{doc_id}/pdf.
"""
from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

_FONTS_DIR = Path(__file__).resolve().parents[2] / "assets" / "fonts"

INFO_PREFIX = "INFO:"

TEAL = (45, 148, 148)
SBER_GREEN = (33, 160, 56)
GRAY = (90, 100, 112)


class _DocPdf(FPDF):
    def header(self):  # noqa: D102
        self.set_fill_color(*SBER_GREEN)
        self.rect(0, 0, 210, 18, style="F")
        self.set_y(5)
        self.set_font("DejaVu", "B", 13)
        self.set_text_color(255, 255, 255)
        self.cell(95, 8, "СБЕР БИЗНЕС · ОАО «Сбер Банк»", align="L")
        self.set_font("DejaVu", "", 9)
        self.cell(0, 8, "BIC BPSBBY2X · г. Минск", align="R")
        self.set_y(26)

    def footer(self):  # noqa: D102
        self.set_y(-14)
        self.set_font("DejaVu", "", 8)
        self.set_text_color(*GRAY)
        self.cell(
            0,
            8,
            "Сформировано в системе «Сбер Бизнес Онлайн» (демо). "
            "Действительно без собственноручной подписи.",
            align="C",
        )


def _row(pdf: _DocPdf, label: str, value: str, *, bold_value: bool = False) -> None:
    label_w = 54
    value_w = pdf.w - pdf.l_margin - pdf.r_margin - label_w
    x0 = pdf.get_x()
    y0 = pdf.get_y()
    pdf.set_font("DejaVu", "", 9)
    pdf.set_text_color(*GRAY)
    pdf.multi_cell(label_w, 9, label, border="B", new_x="RIGHT", new_y="TOP", max_line_height=9)
    pdf.set_xy(x0 + label_w, y0)
    pdf.set_font("DejaVu", "B" if bold_value else "", 10)
    pdf.set_text_color(20, 28, 40)
    pdf.multi_cell(value_w, 9, value or "—", border="B", new_x="LMARGIN", new_y="NEXT", max_line_height=9)


def _is_report(doc_type: str, amount: float) -> bool:
    return doc_type.startswith(INFO_PREFIX) or amount == 0


def render_document_pdf(doc: dict, org_name: str = "") -> bytes:
    """doc: doc_number, doc_date, doc_type, counterparty, amount, currency, status, purpose, id."""
    pdf = _DocPdf(orientation="P", unit="mm", format="A4")
    pdf.add_font("DejaVu", "", str(_FONTS_DIR / "DejaVuSans.ttf"))
    pdf.add_font("DejaVu", "B", str(_FONTS_DIR / "DejaVuSans-Bold.ttf"))
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    doc_type = doc.get("doc_type") or ""
    amount = float(doc.get("amount") or 0)
    report = _is_report(doc_type, amount)
    type_label = doc_type[len(INFO_PREFIX):] if doc_type.startswith(INFO_PREFIX) else doc_type

    pdf.set_font("DejaVu", "B", 16)
    pdf.set_text_color(*TEAL)
    pdf.cell(
        0, 12,
        "Отчёт / информация по счёту" if report else "Платёжный документ",
        new_x="LMARGIN", new_y="NEXT",
    )

    pdf.set_font("DejaVu", "B", 11)
    pdf.set_text_color(20, 28, 40)
    pdf.cell(
        0, 8,
        f"{doc.get('doc_number') or doc.get('id') or ''} от {doc.get('doc_date') or ''}",
        new_x="LMARGIN", new_y="NEXT",
    )
    pdf.ln(4)

    if org_name:
        _row(pdf, "Плательщик", org_name)
    _row(pdf, "Вид документа", type_label, bold_value=True)
    if not report:
        _row(pdf, "Контрагент / счёт", doc.get("counterparty") or "", bold_value=True)
        amount_str = f"{amount:,.2f}".replace(",", " ").replace(".", ",")
        _row(pdf, "Сумма", f"{amount_str} {doc.get('currency') or ''}", bold_value=True)
    elif (doc.get("counterparty") or "").strip():
        _row(pdf, "Счёт", doc.get("counterparty") or "")
    _row(pdf, "Назначение / период", doc.get("purpose") or "")
    _row(pdf, "Статус", doc.get("status") or "", bold_value=True)

    pdf.ln(12)
    signed = (doc.get("status") or "") in ("Проведен", "Подписан", "В обработке")
    if signed:
        # «Штамп» банка
        x, y = pdf.get_x(), pdf.get_y()
        pdf.set_draw_color(*SBER_GREEN)
        pdf.set_line_width(0.8)
        pdf.rect(x, y, 86, 22)
        pdf.set_xy(x, y + 3)
        pdf.set_font("DejaVu", "B", 11)
        pdf.set_text_color(*SBER_GREEN)
        pdf.cell(86, 8, "ПРОВЕДЕНО", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.set_x(x)
        pdf.set_font("DejaVu", "", 8)
        pdf.cell(86, 6, f"ОАО «Сбер Банк» · {doc.get('doc_date') or ''}", align="C")
    else:
        pdf.set_font("DejaVu", "B", 10)
        pdf.set_text_color(*GRAY)
        pdf.cell(0, 8, "Ожидает подписи уполномоченного лица")

    return bytes(pdf.output())
