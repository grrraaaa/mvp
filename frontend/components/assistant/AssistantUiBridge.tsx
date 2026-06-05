"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ASSISTANT_ACTION_EVENT, type AssistantActionDetail } from "@/lib/assistant/uiBridge";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";

/** Слушает custom events от ассистента и открывает модалки / навигацию. */
export function AssistantUiBridge() {
  const router = useRouter();
  const { openDocumentModal } = useSbbolUi();

  useEffect(() => {
    const handler = (e: Event) => {
      const { action, value } = (e as CustomEvent<AssistantActionDetail>).detail;
      if (!action) return;

      if (action === "open-doc-modal" || action === "create-document") {
        openDocumentModal();
        return;
      }
      if (action === "open-payments") {
        router.push("/payments");
        return;
      }
      if (action === "open-statement") {
        router.push("/statement");
        return;
      }
      if (action === "open-salary") {
        router.push("/salary");
        return;
      }
      if (action === "open-services") {
        router.push("/services");
        return;
      }
      if (action.startsWith("fill:")) {
        const field = action.slice(5);
        const input = document.querySelector(
          `[data-assistant-field="${field}"], [name="${field}"]`,
        ) as HTMLInputElement | null;
        if (input && value) {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    };

    window.addEventListener(ASSISTANT_ACTION_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_ACTION_EVENT, handler);
  }, [openDocumentModal, router]);

  return null;
}
