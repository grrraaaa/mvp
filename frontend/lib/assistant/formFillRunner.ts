import { fillCustomerAccountField } from "@/hooks/useSbbolAccountPicker";
import { highlightOcrFields } from "@/hooks/useSbbolPaymentValidation";
import { dispatchAssistantNavigate } from "@/lib/assistant/uiBridge";
import type { SbbolFormType } from "@/lib/sbbol/formContext";
import type { FormFieldAction } from "@/store/assistantStore";
import { useBankingStore } from "@/store/bankingStore";

export type FillOutcome = "filled" | "missed" | "failed";

export interface FillResult {
  filled: string[];
  missed: string[];
  failed: string[];
}

type FillableElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
  | HTMLElement;

const REACT_FIELD_MAP: Record<string, string> = {
  COMMON_COLUMNS_AMOUNT: "payAmount",
  PAYMENT_PURPOSE: "payPurpose",
  CONTRAGENT_ID: "rcptName",
  CONTRAGENT_UNP: "rcptUnp",
  CONTRAGENT_ACCOUNT: "rcptIban",
  COMMON_COLUMNS_CUSTOMER_ACCOUNT: "sourceAcc",
};

const PAYMENT_FIELD_KEYS = new Set([
  "COMMON_COLUMNS_AMOUNT",
  "PAYMENT_PURPOSE",
  "CONTRAGENT_ID",
  "CONTRAGENT_UNP",
  "CONTRAGENT_ACCOUNT",
  "COMMON_COLUMNS_CUSTOMER_ACCOUNT",
  "COMMON_COLUMNS_DOC_NUMBER",
  "COMMON_COLUMNS_DOC_DATE",
  "PAYMENT_URGENCY",
  "PAYMENT_PURPOSE_CODE",
  "PAYMENT_PURPOSE_CATEGORY",
]);

function dispatchInputEvents(el: HTMLElement): void {
  el.dispatchEvent(
    new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText" }),
  );
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;

  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;

  dispatchInputEvents(el);
}

function unlockField(el: FillableElement): void {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    el.removeAttribute("readonly");
    el.disabled = false;
  }
}

function syncSbbolDisplay(el: FillableElement, value: string): void {
  const wrapper = el.closest(
    ".wrapWithErrorSystem-container-JPMb, .LabelWrapper-wrapper-VWP0, .ControlWithIcon-container-IH7d",
  );
  if (!wrapper) return;
  const overflow = wrapper.querySelector(".withCheckOverflow-overflowDetector-FoGV");
  if (overflow instanceof HTMLElement) overflow.textContent = value;
}

function formatCurrencyValue(el: HTMLInputElement, raw: string): string {
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const precision = Number.parseInt(el.getAttribute("precision") ?? "2", 10);
  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num)) return raw;
  const fixed = num.toFixed(Number.isFinite(precision) ? precision : 2);
  const [intPart, fracPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return fracPart !== undefined ? `${grouped}.${fracPart}` : grouped;
}

function prepareValue(el: FillableElement, value: string): string {
  if (el instanceof HTMLInputElement && el.classList.contains("CurrencyInput-input-OvCS")) {
    return formatCurrencyValue(el, value);
  }
  return value;
}

function readFieldValue(el: FillableElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value;
  }
  if (el.isContentEditable) return el.textContent ?? "";
  const inner = el.querySelector("input, textarea, select");
  if (inner instanceof HTMLInputElement || inner instanceof HTMLTextAreaElement) return inner.value;
  return "";
}

function valuesMatch(el: FillableElement, expected: string, actual: string): boolean {
  const norm = (s: string) => s.replace(/\s/g, "").trim();
  if (norm(actual) === norm(expected)) return true;
  if (el instanceof HTMLInputElement && el.classList.contains("CurrencyInput-input-OvCS")) {
    const a = Number.parseFloat(norm(actual).replace(",", "."));
    const b = Number.parseFloat(norm(expected).replace(",", "."));
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.005;
  }
  return false;
}

function queryFieldIn(root: ParentNode, fieldName: string): FillableElement | null {
  const escaped = CSS.escape(fieldName);
  const native = root.querySelector(
    `input[name="${escaped}"], textarea[name="${escaped}"], select[name="${escaped}"]`,
  );
  if (
    native instanceof HTMLInputElement ||
    native instanceof HTMLTextAreaElement ||
    native instanceof HTMLSelectElement
  ) {
    return native;
  }
  const named = root.querySelector(`[name="${escaped}"]`);
  if (named instanceof HTMLElement && !(named instanceof HTMLButtonElement)) return named;
  const shortKey = fieldName.split(".").pop();
  if (shortKey && shortKey !== fieldName) {
    const partial = root.querySelector(
      `input[name$=".${CSS.escape(shortKey)}"], textarea[name$=".${CSS.escape(shortKey)}"]`,
    );
    if (partial instanceof HTMLInputElement || partial instanceof HTMLTextAreaElement) return partial;
  }
  return null;
}

const COUNTERPARTY_PLACEHOLDERS = ["Наименование контрагента или номер счета", "Наименование контрагента"];

function findFieldByPlaceholder(root: ParentNode, placeholders: string[]): FillableElement | null {
  for (const ph of placeholders) {
    const el = root.querySelector(`input[placeholder="${ph}"], textarea[placeholder="${ph}"]`);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
  }
  for (const el of root.querySelectorAll("input[placeholder], textarea[placeholder]")) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) continue;
    const placeholder = el.getAttribute("placeholder") ?? "";
    if (placeholders.some((ph) => placeholder.includes(ph))) return el;
  }
  return null;
}

function findFieldElement(root: HTMLElement, fieldName: string): FillableElement | null {
  const direct = queryFieldIn(root, fieldName);
  if (direct) return direct;
  if (fieldName.includes("CONTRAGENT_ID")) return findFieldByPlaceholder(root, COUNTERPARTY_PLACEHOLDERS);
  return null;
}

function isUrgencyField(el: FillableElement): boolean {
  const name =
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
      ? el.name
      : (el.getAttribute("name") ?? "");
  return name.includes("PAYMENT_URGENCY");
}

function applyUrgencyInput(input: HTMLInputElement, value: string): boolean {
  const prepared = value.replace(/\D/g, "").slice(0, 2);
  if (!prepared) return false;
  unlockField(input);
  input.focus();
  setNativeValue(input, prepared);
  syncSbbolDisplay(input, prepared);
  input.dispatchEvent(new Event("blur", { bubbles: true }));
  return valuesMatch(input, prepared, input.value);
}

function applyFieldValue(el: FillableElement, value: string): boolean {
  const prepared = prepareValue(el, value);
  unlockField(el);
  if (el instanceof HTMLInputElement && isUrgencyField(el)) return applyUrgencyInput(el, value);
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    setNativeValue(el, prepared);
    syncSbbolDisplay(el, prepared);
    return valuesMatch(el, prepared, el.value);
  }
  if (el.isContentEditable) {
    el.textContent = prepared;
    dispatchInputEvents(el);
    syncSbbolDisplay(el, prepared);
    return valuesMatch(el, prepared, readFieldValue(el));
  }
  const innerInput = el.querySelector("input, textarea, select");
  if (innerInput instanceof HTMLInputElement && isUrgencyField(innerInput)) {
    return applyUrgencyInput(innerInput, value);
  }
  if (
    innerInput instanceof HTMLInputElement ||
    innerInput instanceof HTMLTextAreaElement ||
    innerInput instanceof HTMLSelectElement
  ) {
    return applyFieldValue(innerInput, value);
  }
  return false;
}

function fieldLabel(action: FormFieldAction): string {
  return action.label || action.field.split(".").pop() || action.field;
}

function fillField(root: HTMLElement, action: FormFieldAction): FillOutcome {
  if (action.field.includes("COMMON_COLUMNS_CUSTOMER_ACCOUNT")) {
    const accounts = useBankingStore.getState().accounts;
    if (fillCustomerAccountField(root, action.value, accounts)) return "filled";
  }
  const el = findFieldElement(root, action.field);
  if (!el) return "missed";
  if (el instanceof HTMLElement && el.matches('[data-name$="COMMON_COLUMNS_CUSTOMER_ACCOUNT"]')) {
    const accounts = useBankingStore.getState().accounts;
    return fillCustomerAccountField(root, action.value, accounts) ? "filled" : "failed";
  }
  const before = readFieldValue(el);
  const ok = applyFieldValue(el, action.value);
  if (ok) return "filled";
  const after = readFieldValue(el);
  if (after !== before && valuesMatch(el, action.value, after)) return "filled";
  return "failed";
}

export function fieldKeyFromAction(action: FormFieldAction): string {
  return action.field.split(".").pop() ?? action.field;
}

export function isPaymentFormAction(action: FormFieldAction): boolean {
  const key = fieldKeyFromAction(action);
  return PAYMENT_FIELD_KEYS.has(key) || action.field.includes("PAYDOC") || action.field.includes("INSTANT");
}

export function runFormFillOnRoot(root: HTMLElement, actions: FormFieldAction[]): FillResult {
  const filled: string[] = [];
  const missed: string[] = [];
  const failed: string[] = [];
  for (const action of actions) {
    const label = fieldLabel(action);
    const outcome = fillField(root, action);
    if (outcome === "filled") filled.push(label);
    else if (outcome === "failed") failed.push(label);
    else missed.push(label);
  }
  return { filled, missed, failed };
}

export function fillReactAssistantFields(actions: FormFieldAction[]): FillResult {
  const filled: string[] = [];
  const missed: string[] = [];
  const failed: string[] = [];

  for (const action of actions) {
    const key = fieldKeyFromAction(action);
    const reactField = REACT_FIELD_MAP[key];
    const label = fieldLabel(action);
    if (!reactField) {
      missed.push(label);
      continue;
    }
    const el = document.querySelector(`[data-assistant-field="${reactField}"]`);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      missed.push(label);
      continue;
    }
    unlockField(el);
    setNativeValue(el, action.value);
    if (valuesMatch(el, action.value, el.value)) filled.push(label);
    else failed.push(label);
  }

  return { filled, missed, failed };
}

function paymentFormRouteForActions(actions: FormFieldAction[]): string {
  const fields = actions.map((a) => a.field).join(" ");
  if (fields.includes("INSTANT")) return "/payments/instant";
  if (fields.includes("PAYDOCCUR")) return "/payments/paydoccur";
  return "/payments/paydocbyn";
}

export function ensurePaymentUiOpen(actions: FormFieldAction[], pathname: string): void {
  const hasPayment = actions.some(isPaymentFormAction);
  if (!hasPayment) return;
  if (
    pathname.startsWith("/payments/paydocbyn") ||
    pathname.startsWith("/payments/instant") ||
    pathname.startsWith("/payments/paydoccur")
  ) {
    return;
  }
  dispatchAssistantNavigate(paymentFormRouteForActions(actions));
}

export function findSbbolFormRoot(): HTMLElement | null {
  const root = document.querySelector(".sbbol-orig-root");
  return root instanceof HTMLElement ? root : null;
}

export async function applyFormActionsWithRetry(
  actions: FormFieldAction[],
  options?: { pathname?: string; maxAttempts?: number; delayMs?: number },
): Promise<FillResult | null> {
  const maxAttempts = options?.maxAttempts ?? 24;
  const delayMs = options?.delayMs ?? 150;
  const pathname = options?.pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");

  if (!useBankingStore.getState().accounts.length) {
    await useBankingStore.getState().loadAll().catch(() => null);
  }

  ensurePaymentUiOpen(actions, pathname);

  let lastResult: FillResult = { filled: [], missed: [], failed: [] };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sbbolRoot = findSbbolFormRoot();
    if (sbbolRoot) {
      lastResult = runFormFillOnRoot(sbbolRoot, actions);
      if (lastResult.filled.length > 0) {
        highlightOcrFields(sbbolRoot);
        return lastResult;
      }
    }

    const reactResult = fillReactAssistantFields(actions);
    if (reactResult.filled.length > 0) {
      return reactResult;
    }

    lastResult = {
      filled: [],
      missed: [...new Set([...lastResult.missed, ...reactResult.missed])],
      failed: [...new Set([...lastResult.failed, ...reactResult.failed])],
    };

    await new Promise((r) => setTimeout(r, delayMs));
  }

  return lastResult.filled.length > 0 ? lastResult : null;
}

const FORM_NAME_PREFIX: Record<SbbolFormType, string> = {
  paydocby: "forms.PAYDOCBY",
  instant: "forms.INSTANT_PAYMENT_ORDER",
  paydoccur: "forms.PAYDOCCUR",
};

/** Снимок уже заполненных полей на открытой форме — для синхронизации с чатом. */
export function collectFormFieldSnapshot(formType: SbbolFormType): Record<string, string> {
  const root = document.querySelector("main#app") ?? document.body;
  if (!(root instanceof HTMLElement)) return {};

  const prefix = FORM_NAME_PREFIX[formType];
  const out: Record<string, string> = {};

  for (const key of PAYMENT_FIELD_KEYS) {
    const fieldName = `${prefix}.${key}`;
    const el = findFieldElement(root, fieldName);
    if (!el) continue;
    const value = readFieldValue(el).trim();
    if (value) out[fieldName] = value;
  }

  return out;
}
