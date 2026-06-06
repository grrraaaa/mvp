export interface BankAccount {
  id: string;
  type: string;
  label: string;
  balance: number;
  currency: "BYN" | "USD" | "EUR" | "RUB";
  hidden?: boolean;
}

export type DocumentStatus =
  | "Проведен"
  | "Черновик"
  | "На подписи"
  | "Подписан"
  | "В обработке"
  | "Отказан"
  | "Удален";

export interface BankDocument {
  id: string;
  date: string;
  type: string;
  counterparty: string;
  amount: number;
  currency: "BYN" | "USD" | "EUR" | "RUB";
  status: DocumentStatus;
  purpose: string;
}

export interface EmployeeSalary {
  id: string;
  fullName: string;
  cardNumber: string;
  amount: number;
  status: "Готов" | "Оплачен" | "Ошибка";
}

export interface Counterparty {
  id: string;
  name: string;
  unp: string;
  account: string;
  bank_name: string;
}

export interface StatementFilter {
  account: string;
  period: "Сегодня" | "Вчера" | "5дней" | "месяц" | "квартал" | "год";
  showZeroTurnover: boolean;
  showDaily: boolean;
  showRevaluation: boolean;
}
