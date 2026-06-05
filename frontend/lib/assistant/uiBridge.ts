/** Мост ассистента → клики и действия в UI (React + DOM). */

export const ASSISTANT_ACTION_EVENT = "sber-assistant-action";

export interface AssistantActionDetail {
  action: string;
  value?: string;
}

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
      dispatchAssistantAction(a.target, a.value);
      continue;
    }
    if (a.type === "fill") {
      dispatchAssistantAction(`fill:${a.target}`, a.value);
      continue;
    }
    // click — сначала DOM, потом custom event для React
    const el = document.querySelector(`[data-assistant-action="${a.target}"]`);
    if (el instanceof HTMLElement) {
      el.click();
    } else {
      dispatchAssistantAction(a.target, a.value);
    }
  }
}
