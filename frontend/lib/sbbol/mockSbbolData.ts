export const MOCK_ORG_NAME = "DEMO ЮРИДИЧЕСКОЕ ЛИЦО";

export const MOCK_BALANCES = {
  byn: "500.00",
  usd: "0.00",
  rub: "3 000.00",
  eur: "2 000.00",
};

export interface MockAccount {
  currency: string;
  iban: string;
  type: string;
  note: string;
  balance: string;
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    currency: "BYN",
    iban: "BY51 BPSB 3012 2222 2222 2933 2222",
    type: "Текущий (расчетный) счет",
    note: "крутой",
    balance: "200.00",
  },
  {
    currency: "BYN",
    iban: "BY69 BPSB 3012 3333 3333 3933 3333",
    type: "Карточный счет",
    note: "Добрый счёт",
    balance: "300.00",
  },
  {
    currency: "EUR",
    iban: "BY41 BPSB 3012 0000 0000 0978 0000",
    type: "Текущий (расчетный) счет",
    note: "заметка",
    balance: "2 000.00",
  },
];

export const PROMO_BANNERS = [
  {
    title: "Больше стран для\u00a0 проверки контрагента",
    subtitle: "Сервис включен в\u00a0пакеты услуг",
  },
  {
    title: "Бизнес-аналитика для вашей компании",
    subtitle: "Отчёты и динамика оборотов в одном месте",
  },
];
