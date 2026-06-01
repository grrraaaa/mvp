import { PAYMENT_DOCUMENT_ROUTES } from "@/lib/sbbol/paymentDocumentRoutes";

/** Section tiles on /payments (SectionPage-navLink buttons). */
export const PAYMENTS_SECTION_LINK_ROUTES: Record<string, string> = {
  PAYORDERBY: PAYMENT_DOCUMENT_ROUTES.PAYDOCBY,
  PAYMENT_ORDER: PAYMENT_DOCUMENT_ROUTES.INSTANT_PAYMENT_ORDER,
  PAYDOCCUR: PAYMENT_DOCUMENT_ROUTES.PAYDOCCUR,
  CURRBUY: "/payments/currency",
  APPLPAYMENTPAYORDERCLAIM: "/payments/order",
};

/** Section tiles on /salary. */
export const SALARY_SECTION_LINK_ROUTES: Record<string, string> = {
  APPLSALARYPROJECT: "/salary/project",
  PAYMENT_OF_WAGES: "/salary",
  CASHLIST: "/salary/employees",
  INFORMATION_ON_OBLIGATION: "/salary/obligations",
  INFORMATION_ON_PENSION: "/salary/pension",
};

export const DOCUMENT_DEMO_MESSAGES: Record<string, string> = {
  "document.save": "Документ сохранён (демо)",
  "document.check": "Проверка документа выполнена (демо)",
  "document.goToPrint": "Печать недоступна в демо-режиме",
  "document.saveAsTemplate": "Шаблон сохранён (демо)",
  "document.actionsArrow": "Дополнительные действия — демо-режим",
};

export interface OrigPageInteractionConfig {
  /** Route for header.back and document.close. Defaults to "/". */
  backRoute?: string;
  /** Maps SectionPage-navLink `name` attributes to internal routes. */
  sectionRoutes?: Record<string, string>;
  /** Opens the document type picker (Создать документ). */
  onCreateDoc?: () => void;
}

export function getOrigPageInteractionConfig(path: string): OrigPageInteractionConfig {
  if (path === "/payments") {
    return { backRoute: "/", sectionRoutes: PAYMENTS_SECTION_LINK_ROUTES };
  }
  if (path.startsWith("/payments/")) {
    return { backRoute: "/payments" };
  }
  if (path === "/salary") {
    return { backRoute: "/", sectionRoutes: SALARY_SECTION_LINK_ROUTES };
  }
  if (path === "/statement") {
    return { backRoute: "/" };
  }
  return { backRoute: "/" };
}
