/** Context-aware quick prompts for the SBBOL demo assistant. */

import { isPaymentFormRoute } from "@/lib/sbbol/formContext";

const HOME_CHIPS = [
  "Сколько на счёте",
  "Создать документ",
  "Повтори последний платёж",
  "Покажи выписку",
  "📊 Графики",
];

const PAYMENTS_CHIPS = [
  "Создать документ",
  "Платёжное поручение BYN",
  "Мгновенный платёж",
  "Повтори последний платёж",
];

const STATEMENT_CHIPS = [
  "Выписка по счёту",
  "Справки по счёту",
  "Сколько на счёте",
];

const SALARY_CHIPS = [
  "Зарплатный проект",
  "Выплатить зарплату",
  "Сотрудники",
];

const SERVICES_CHIPS = [
  "Покажи расходы за месяц",
  "Сравни февраль и март",
  "Прогноз кассового разрыва",
];

const PRODUCTS_CHIPS = [
  "Переводы на корпоративные карты",
  "Кредиты",
  "Депозиты",
  "Корпоративные карты",
  "Сколько на счёте",
];

const DOCUMENTS_CHIPS = [
  "Покажи все документы",
  "Документы на подпись",
  "Документы за 2026 год",
  "Документы за март 2026",
  "Документы за квартал",
];

const SETTINGS_CHIPS = [
  "Счета организации",
  "Безопасность",
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
  "Сколько на счёте",
  "Создать документ",
  "Перейди в расчёты",
  "Покажи выписку",
  "📊 Графики",
];

const MOBILE_CHIP_LIMIT = 3;

export interface QuickChipOptions {
  mobile?: boolean;
}

export function getAssistantQuickChips(pathname: string, options?: QuickChipOptions): string[] {
  const route = pathname.replace(/\/$/, "") || "/";
  let chips: string[];

  if (route === "/") chips = HOME_CHIPS;
  else if (route === "/payments") chips = PAYMENTS_CHIPS;
  else if (route === "/statement" || route.startsWith("/statement/")) chips = STATEMENT_CHIPS;
  else if (route === "/salary" || route.startsWith("/salary/")) chips = SALARY_CHIPS;
  else if (route === "/services" || route.startsWith("/services/")) chips = SERVICES_CHIPS;
  else if (route === "/products" || route.startsWith("/products/")) chips = PRODUCTS_CHIPS;
  else if (route === "/other/documents" || route.startsWith("/other/documents")) chips = DOCUMENTS_CHIPS;
  else if (route === "/settings" || route.startsWith("/settings/")) chips = SETTINGS_CHIPS;
  else if (isPaymentFormRoute(pathname)) {
    chips = dedupeChips([...FORM_FILL_CHIPS, ...(FORM_FIELD_CHIPS[route] ?? [])]);
  } else if (route.startsWith("/payments/")) chips = PAYMENTS_CHIPS;
  else chips = DEFAULT_CHIPS;

  if (options?.mobile) {
    return chips.slice(0, MOBILE_CHIP_LIMIT);
  }
  return chips;
}
