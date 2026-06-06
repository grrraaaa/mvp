/** Мост ассистента → клики и действия в UI (React + DOM). */

export const ASSISTANT_ACTION_EVENT = "sber-assistant-action";

export interface AssistantActionDetail {
  action: string;
  value?: string;
}

/** Действия без DOM-кнопки — только через custom event. */
const EVENT_ONLY_ACTIONS = new Set([
  "run-payroll",
  "open-doc-modal",
  "open-payments",
  "open-statement",
  "open-salary",
  "open-services",
  "open-payment-byn",
  "open-payment-instant",
  "open-payment-cur",
  "open-payment-byn-modal",
  "open-statement-account",
  "open-statement-cert",
  "open-salary-project",
  "open-employees",
  "open-onec-import",
  "statement-month",
  "open-credits",
  "open-deposits",
  "open-cards",
]);

export function dispatchAssistantAction(action: string, value?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AssistantActionDetail>(ASSISTANT_ACTION_EVENT, {
      detail: { action, value },
    }),
  );
}

export interface UiActionPayload {
  type: string;
  target: string;
  value?: string;
}

export function executeUiActions(actions: UiActionPayload[]) {
  for (const a of actions) {
    if (a.type === "navigate") {
      window.location.href = a.target;
      continue;
    }
    if (a.type === "open_modal") {
      const target = a.target === "service-application" ? "service-application" : a.target;
      dispatchAssistantAction(target, a.value);
      continue;
    }
    if (a.type === "fill") {
      dispatchAssistantAction(`fill:${a.target}`, a.value);
      continue;
    }
    if (a.type === "click") {
      if (EVENT_ONLY_ACTIONS.has(a.target)) {
        dispatchAssistantAction(a.target, a.value);
        continue;
      }
      const el = document.querySelector(`[data-assistant-action="${a.target}"]`);
      if (el instanceof HTMLElement) {
        el.click();
      } else {
        dispatchAssistantAction(a.target, a.value);
      }
    }
  }
}
