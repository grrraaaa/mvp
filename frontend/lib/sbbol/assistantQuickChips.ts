/** Context-aware quick prompts for the SBBOL demo assistant. */

import { isPaymentFormRoute } from "@/lib/sbbol/formContext";

const HOME_CHIPS = [
  "Перейди в расчёты",
  "Выписка по счёту",
  "Зарплатный проект",
  "Мгновенный платеж",
];

const PAYMENTS_CHIPS = [
  "Создать документ",
  "Платежное поручение BYN",
  "Мгновенный платеж",
  "Перевод в инвалюте",
];

const STATEMENT_CHIPS = [
  "Выписка по счёту",
  "Справки по счёту",
  "На главную",
];

const SALARY_CHIPS = [
  "Зарплатный проект",
  "Сотрудники",
  "Выплата зарплаты",
  "На главную",
];

const FORM_FILL_CHIPS = [
  "Помоги заполнить форму",
  "Сумма 1500, назначение — аренда",
  "Заполнить с фото (кнопка 📷)",
];

const FORM_FIELD_CHIPS: Record<string, string[]> = {
  "/payments/paydocbyn": ["Сумма 100", "Назначение оплата", "Получатель ООО Пример"],
  "/payments/instant": ["Сумма 50", "Назначение платеж", "Получатель Иванов"],
  "/payments/paydoccur": ["Сумма перевода 200", "Назначение валютный перевод", "Получатель"],
};

function dedupeChips(chips: string[]): string[] {
  const seen = new Set<string>();
  return chips.filter((chip) => {
    if (seen.has(chip)) return false;
    seen.add(chip);
    return true;
  });
}

const DEFAULT_CHIPS = [
  "Перейди в расчёты",
  "Открой платежное поручение BYN",
  "Покажи выписку",
  "Мгновенный платеж",
];

const MOBILE_CHIP_LIMIT = 3;

export interface QuickChipOptions {
  /** Shorter list for narrow screens */
  mobile?: boolean;
}

export function getAssistantQuickChips(pathname: string, options?: QuickChipOptions): string[] {
  const route = pathname.replace(/\/$/, "") || "/";
  let chips: string[];

  if (route === "/") chips = HOME_CHIPS;
  else if (route === "/payments") chips = PAYMENTS_CHIPS;
  else if (route === "/statement" || route.startsWith("/statement/")) chips = STATEMENT_CHIPS;
  else if (route === "/salary" || route.startsWith("/salary/")) chips = SALARY_CHIPS;
  else if (isPaymentFormRoute(pathname)) {
    chips = dedupeChips([...FORM_FILL_CHIPS, ...(FORM_FIELD_CHIPS[route] ?? [])]);
  }
  else if (route.startsWith("/payments/")) chips = PAYMENTS_CHIPS;
  else chips = DEFAULT_CHIPS;

  if (options?.mobile) {
    return chips.slice(0, MOBILE_CHIP_LIMIT);
  }
  return chips;
}
