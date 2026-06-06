/** Map source highlight keys → SBBOL form field name fragments. */
const FIELD_PARTS: Record<string, string[]> = {
  amount: ["AMOUNT", "SUM"],
  counterparty: ["CONTRAGENT", "RECIPIENT", "CONTRAGENT"],
  purpose: ["PURPOSE", "DETAILS", "PAYMENT_PURPOSE"],
  unp: ["UNP"],
  iban: ["ACCOUNT", "IBAN"],
  date: ["DOC_DATE", "DATE"],
};

export function parseHighlightFields(search: string | URLSearchParams): string[] {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const hl = params.get("hl");
  if (hl) return hl.split(",").map((s) => s.trim()).filter(Boolean);
  if (params.get("highlight")) return ["amount", "counterparty", "purpose"];
  return [];
}

export function buildHighlightUrl(baseUrl: string, fields: string[]): string {
  if (!fields.length) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}hl=${fields.join(",")}`;
}

export function applyFieldHighlights(root: HTMLElement, fields: string[]): void {
  let first: HTMLElement | null = null;
  for (const field of fields) {
    const parts = FIELD_PARTS[field] ?? [field.toUpperCase()];
    for (const part of parts) {
      const el = root.querySelector(
        `[name*="${part}"], [data-assistant-field="${field}"]`,
      ) as HTMLElement | null;
      if (!el) continue;
      el.classList.add("assistant-source-highlight");
      el.style.boxShadow = "inset 0 0 0 3px #21A038";
      el.style.transition = "box-shadow 0.3s ease";
      if (!first) first = el;
    }
  }
  first?.scrollIntoView({ behavior: "smooth", block: "center" });
}
