export interface BankAccount {
  id: string; // e.g. "BY51 BPSB..."
  type: string; // e.g. "Текущий (расчетный) счет"
  label: string; // e.g. "крутой"
  balance: number;
  currency: 'BYN' | 'USD' | 'EUR' | 'RUB';
  hidden?: boolean;
}

export type DocumentStatus = 'Проведен' | 'Черновик' | 'На подписи';

export interface BankDocument {
  id: string; // e.g. "№ 120"
  date: string; // DD.MM.YYYY
  type: string; // "Перевод в BYN", "Зарплатный проект", "Покупка валюты"
  counterparty: string;
  amount: number;
  currency: 'BYN' | 'USD' | 'EUR' | 'RUB';
  status: DocumentStatus;
  purpose: string;
}

export interface EmployeeSalary {
  id: string;
  fullName: string;
  cardNumber: string;
  amount: number;
  status: 'Готов' | 'Оплачен' | 'Ошибка';
}

export interface StatementFilter {
  account: string; // account ID or "all"
  period: 'Сегодня' | 'Вчера' | '5дней' | 'месяц';
  showZeroTurnover: boolean;
  showDaily: boolean;
  showRevaluation: boolean;
}
