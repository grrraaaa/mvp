"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ASSISTANT_ACTION_EVENT,
  ASSISTANT_NAVIGATE_EVENT,
  type AssistantActionDetail,
} from "@/lib/assistant/uiBridge";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import { PRODUCT_ROUTES } from "@/lib/banking/productCatalog";
import { useBankingStore } from "@/store/bankingStore";
import { useRole } from "@/store/roleStore";

const ROUTE_BY_ACTION: Record<string, string> = {
  "open-payments": "/payments",
  "open-statement": "/statement",
  "open-salary": "/salary",
  "open-services": "/services",
  "open-payment-byn": "/payments/paydocbyn",
  "open-payment-instant": "/payments/instant",
  "open-payment-cur": "/payments/paydoccur",
  "open-payment-byn-modal": "/payments/paydocbyn",
  "open-payment-currency": "/payments/currency",
  "open-payment-order": "/payments/order",
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
  const { can } = useRole();
  const canFormatDocumentAi = can("format_document_ai");
  const canCreateDocument = can("create_document");

  useEffect(() => {
    const handler = (e: Event) => {
      const { action, value } = (e as CustomEvent<AssistantActionDetail>).detail;
      if (!action) return;

      /** Заполнение полей формы через ИИ-ассистента доступно не всем ролям.
       *  Блокируем на входе, чтобы админ не мог обойти проверки в AssistantPanel. */
      if (action.startsWith("fill:") && !canFormatDocumentAi) {
        console.warn("[AssistantUiBridge] fill blocked: insufficient permissions");
        return;
      }

      /** Создание документа — отдельный пермишен create_document.
       *  Без него открывать модалку нельзя (для admin запрещено). */
      if (
        (action === "open-doc-modal" || action === "create-document") &&
        !canCreateDocument
      ) {
        console.warn("[AssistantUiBridge] create-document blocked: insufficient permissions");
        return;
      }

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

      const stmtPeriodRoutes: Record<string, string> = {
        "statement-today": "/statement?period=today&autoload=1",
        "statement-month": "/statement?period=month&autoload=1",
        "statement-quarter": "/statement?period=quarter&autoload=1",
        "statement-period": "/statement?period=year&autoload=1",
      };
      if (action in stmtPeriodRoutes) {
        router.push(stmtPeriodRoutes[action]);
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

    const onNavigate = (e: Event) => {
      const path = (e as CustomEvent<{ path: string }>).detail?.path;
      if (path?.startsWith("/")) router.push(path);
    };

    window.addEventListener(ASSISTANT_ACTION_EVENT, handler);
    window.addEventListener(ASSISTANT_NAVIGATE_EVENT, onNavigate);
    return () => {
      window.removeEventListener(ASSISTANT_ACTION_EVENT, handler);
      window.removeEventListener(ASSISTANT_NAVIGATE_EVENT, onNavigate);
    };
  }, [openDocumentModal, openServiceApplication, router, canFormatDocumentAi, canCreateDocument]);

  return null;
}
