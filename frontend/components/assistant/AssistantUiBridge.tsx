"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ASSISTANT_ACTION_EVENT, type AssistantActionDetail } from "@/lib/assistant/uiBridge";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import { PRODUCT_ROUTES } from "@/lib/banking/productCatalog";
import { useBankingStore } from "@/store/bankingStore";

const ROUTE_BY_ACTION: Record<string, string> = {
  "open-payments": "/payments",
  "open-statement": "/statement",
  "open-salary": "/salary",
  "open-services": "/services",
  "open-payment-byn": "/payments/paydocbyn",
  "open-payment-instant": "/payments/instant",
  "open-payment-cur": "/payments/paydoccur",
  "open-statement-account": "/statement/account",
  "open-statement-cert": "/statement/certificates",
  "open-salary-project": "/salary/project",
  "open-employees": "/salary/employees",
  "open-credits": "/products/credits",
  "open-deposits": "/products/deposits",
  "open-cards": "/products/cards",
  "open-info-requests": "/other/info-requests",
  "open-learning": "/learning",
  "open-onec-import": "/services/onec",
  "run-payroll": "/salary",
  "statement-month": "/statement/account",
  "create-info-request": "/other/info-requests",
  "create-corpo-transfer": "/products/corpo-card-transfers",
  ...PRODUCT_ROUTES,
};

/** Слушает custom events от ассистента и открывает модалки / навигацию. */
export function AssistantUiBridge() {
  const router = useRouter();
  const { openDocumentModal, openServiceApplication } = useSbbolUi();

  useEffect(() => {
    const handler = (e: Event) => {
      const { action, value } = (e as CustomEvent<AssistantActionDetail>).detail;
      if (!action) return;

      if (action === "open-doc-modal" || action === "create-document") {
        openDocumentModal();
        return;
      }

      if (action === "reload-banking") {
        void useBankingStore.getState().loadAll();
        return;
      }

      if (action === "run-payroll") {
        router.push("/salary");
        return;
      }

      if (action === "open-onec-import") {
        router.push("/services/onec");
        return;
      }

      if (action === "service-application" || action === "connect-service") {
        openServiceApplication(value);
        return;
      }

      const route = ROUTE_BY_ACTION[action];
      if (route) {
        router.push(route);
        return;
      }

      if (action.startsWith("fill:")) {
        const field = action.slice(5);
        const input = document.querySelector(
          `[data-assistant-field="${field}"], [name="${field}"]`,
        ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (input && value != null) {
          const proto =
            input instanceof HTMLTextAreaElement
              ? HTMLTextAreaElement.prototype
              : input instanceof HTMLSelectElement
                ? HTMLSelectElement.prototype
                : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
          if (setter) setter.call(input, value);
          else input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    };

    window.addEventListener(ASSISTANT_ACTION_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_ACTION_EVENT, handler);
  }, [openDocumentModal, openServiceApplication, router]);

  return null;
}
