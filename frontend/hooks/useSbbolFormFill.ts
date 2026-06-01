"use client";

import { useEffect, type RefObject } from "react";
import { useAssistantStore, type FormFieldAction } from "@/store/assistantStore";
import { showStubToast } from "@/lib/sbbol/stubToast";

type FillableElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
  | HTMLElement;

type FillOutcome = "filled" | "missed" | "failed";

function dispatchInputEvents(el: HTMLElement): void {
  el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText" }));
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
  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }

  dispatchInputEvents(el);
}

function unlockField(el: FillableElement): void {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    el.removeAttribute("readonly");
    el.disabled = false;
  }
}

/** SBBOL mirrors input text in an overflow-detector sibling (hidden; kept in sync for parity). */
function syncSbbolDisplay(el: FillableElement, value: string): void {
  const wrapper = el.closest(
    ".wrapWithErrorSystem-container-JPMb, .LabelWrapper-wrapper-VWP0, .ControlWithIcon-container-IH7d"
  );
  if (!wrapper) return;

  const overflow = wrapper.querySelector(".withCheckOverflow-overflowDetector-FoGV");
  if (overflow instanceof HTMLElement) {
    overflow.textContent = value;
  }
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
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    return el.value;
  }
  if (el.isContentEditable) {
    return el.textContent ?? "";
  }
  const inner = el.querySelector("input, textarea, select");
  if (inner instanceof HTMLInputElement || inner instanceof HTMLTextAreaElement) {
    return inner.value;
  }
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
    `input[name="${escaped}"], textarea[name="${escaped}"], select[name="${escaped}"]`
  );
  if (
    native instanceof HTMLInputElement ||
    native instanceof HTMLTextAreaElement ||
    native instanceof HTMLSelectElement
  ) {
    return native;
  }

  const named = root.querySelector(`[name="${escaped}"]`);
  if (named instanceof HTMLElement && !(named instanceof HTMLButtonElement)) {
    return named;
  }

  const shortKey = fieldName.split(".").pop();
  if (shortKey && shortKey !== fieldName) {
    const partial = root.querySelector(
      `input[name$=".${CSS.escape(shortKey)}"], textarea[name$=".${CSS.escape(shortKey)}"]`
    );
    if (partial instanceof HTMLInputElement || partial instanceof HTMLTextAreaElement) {
      return partial;
    }
  }

  return null;
}

function findFieldElement(root: HTMLElement, fieldName: string): FillableElement | null {
  return queryFieldIn(root, fieldName);
}

function applyFieldValue(el: FillableElement, value: string): boolean {
  const prepared = prepareValue(el, value);
  unlockField(el);

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
  if (
    innerInput instanceof HTMLInputElement ||
    innerInput instanceof HTMLTextAreaElement ||
    innerInput instanceof HTMLSelectElement
  ) {
    return applyFieldValue(innerInput, value);
  }

  return false;
}

function fillField(root: HTMLElement, action: FormFieldAction): FillOutcome {
  const el = findFieldElement(root, action.field);
  if (!el) return "missed";

  const before = readFieldValue(el);
  const ok = applyFieldValue(el, action.value);
  if (ok) return "filled";

  const after = readFieldValue(el);
  if (after !== before && valuesMatch(el, action.value, after)) {
    return "filled";
  }

  return "failed";
}

function fieldLabel(action: FormFieldAction): string {
  return action.label || action.field.split(".").pop() || action.field;
}

export function useSbbolFormFill(rootRef: RefObject<HTMLElement | null>) {
  const formActions = useAssistantStore((s) => s.formActions);
  const clearFormActions = useAssistantStore((s) => s.clearFormActions);

  useEffect(() => {
    if (!formActions?.length || !rootRef.current) return;

    const root = rootRef.current;
    const filled: string[] = [];
    const missed: string[] = [];
    const failed: string[] = [];

    for (const action of formActions) {
      const label = fieldLabel(action);
      const outcome = fillField(root, action);
      if (outcome === "filled") filled.push(label);
      else if (outcome === "failed") failed.push(label);
      else missed.push(label);
    }

    if (filled.length) {
      showStubToast(`Заполнено: ${filled.join(", ")}`);
    }
    if (failed.length) {
      showStubToast(`Не удалось изменить поле: ${failed.join(", ")}`);
    }
    if (missed.length) {
      showStubToast(`Не найдены поля: ${missed.join(", ")}`);
    }

    clearFormActions();
  }, [formActions, rootRef, clearFormActions]);
}
