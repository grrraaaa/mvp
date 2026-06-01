import fs from "fs";
import path from "path";

const RAW_HTML_DIR = path.join(process.cwd(), "lib/sbbol/raw-html");

/** All payment form captures live in one file; forms are extracted by `name`. */
const PAYMENT_FORMS_SOURCE = "payments-paydocbyn.html";

const ROUTE_FILES: Record<string, string> = {
  "/payments": "payments.html",
  "/payments/paydocbyn": PAYMENT_FORMS_SOURCE,
  "/payments/instant": PAYMENT_FORMS_SOURCE,
  "/payments/paydoccur": PAYMENT_FORMS_SOURCE,
  "/statement": "statement.html",
  "/salary": "salary.html",
};

const FRAGMENT_FILES: Record<string, string> = {
  "document-types-modal": "document-types-modal.html",
};

/** Payment form pages: extract only the visible form block from full-page captures. */
const PAYMENT_FORM_NAMES: Record<string, string> = {
  "/payments/paydocbyn": "forms.PAYDOCBY",
  "/payments/instant": "forms.INSTANT_PAYMENT_ORDER",
  "/payments/paydoccur": "forms.PAYDOCCUR",
};

export const DEMO_PAGE_HTML_ROUTES = Object.keys(ROUTE_FILES);

/** Strip scripts/noise and normalize asset paths for static rendering. */
function sanitizeOrigHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<img\b[^>]*src="\/sber-orig\/(?:0|f|J)"[^>]*>/gi, "")
    .replace(/\/sber-orig\/css\/main\.bundle\.css/g, "/sber-orig/static/main.bundle.css")
    .replace(/\/sber-orig\/css\/fonts\.css/g, "/sber-orig/static/fonts/fonts.css")
    .replace(/href="(?:https?:\/\/[^"]+)?\/?static\/([^"]+\.css)"/g, 'href="/sber-orig/static/$1"')
    .replace(/src="(?:https?:\/\/[^"]+)?\/?static\/([^"]+)"/g, 'src="/sber-orig/static/$1"');
}

function extractPaymentFormHtml(html: string, formName: string): string | null {
  const marker = `name="${formName}"`;
  const formIdx = html.indexOf(marker);
  if (formIdx === -1) return null;

  const wrapperIdx = html.lastIndexOf('class="mainContentWrapper"', formIdx);
  if (wrapperIdx === -1) return null;

  const divStart = html.lastIndexOf("<div", wrapperIdx);
  if (divStart === -1) return null;

  const formEnd = html.indexOf("</form>", formIdx);
  if (formEnd === -1) return null;

  const afterForm = html.slice(formEnd + "</form>".length, formEnd + "</form>".length + 48);
  const closingMatch = afterForm.match(/^((?:<\/div>)+)/);
  const closing = closingMatch?.[1] ?? "</div></div></div></div>";

  return html.slice(divStart, formEnd + "</form>".length) + closing;
}

function loadRouteHtml(route: string): string | null {
  const file = ROUTE_FILES[route];
  if (!file) return null;

  const filePath = path.join(RAW_HTML_DIR, file);
  if (!fs.existsSync(filePath)) return null;

  const raw = sanitizeOrigHtml(fs.readFileSync(filePath, "utf-8"));
  const formName = PAYMENT_FORM_NAMES[route];
  if (formName) {
    return extractPaymentFormHtml(raw, formName) ?? raw;
  }
  return raw;
}

export function getDemoPageHtml(route: string): string | null {
  return loadRouteHtml(route);
}

export function hasDemoPageHtml(route: string): boolean {
  return route in ROUTE_FILES;
}

export function getDemoPageFragment(name: string): string | null {
  const file = FRAGMENT_FILES[name];
  if (!file) return null;

  const filePath = path.join(RAW_HTML_DIR, file);
  if (!fs.existsSync(filePath)) return null;

  return sanitizeOrigHtml(fs.readFileSync(filePath, "utf-8"));
}
