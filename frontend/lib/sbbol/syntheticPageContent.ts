import { MOCK_ACCOUNTS, MOCK_ORG_NAME } from "./mockSbbolData";

export type DemoContentType =
  | "table"
  | "form"
  | "cards"
  | "info"
  | "exchange"
  | "profile";

export interface DemoTableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

export interface DemoTableRow {
  [key: string]: string;
}

export interface DemoFormField {
  label: string;
  value?: string;
  placeholder?: string;
  type?: "text" | "select" | "date" | "textarea";
  options?: string[];
  wide?: boolean;
}

export interface DemoCard {
  title: string;
  description: string;
  image?: string;
  badge?: string;
}

export interface SyntheticPageBody {
  type: DemoContentType;
  toolbar?: {
    primaryAction?: string;
    search?: boolean;
    filters?: string[];
  };
  tabs?: string[];
  activeTab?: number;
  table?: { columns: DemoTableColumn[]; rows: DemoTableRow[] };
  form?: { fields: DemoFormField[]; submitLabel?: string };
  cards?: DemoCard[];
  info?: { html: string; image?: string };
  rates?: { currency: string; buy: string; sell: string; nbrb: string }[];
}

export const SYNTHETIC_PAGE_BODIES: Record<string, SyntheticPageBody> = {
  "/money/movements": {
    type: "table",
    toolbar: { search: true, filters: ["Все счета", "Период: май 2026"] },
    tabs: ["Все", "Поступления", "Списания"],
    table: {
      columns: [
        { key: "date", label: "Дата" },
        { key: "doc", label: "Документ" },
        { key: "counterparty", label: "Контрагент" },
        { key: "amount", label: "Сумма", align: "right" },
        { key: "status", label: "Статус" },
      ],
      rows: [
        {
          date: "30.05.2026",
          doc: "Платёжное поручение №124",
          counterparty: 'ООО "БелТорг"',
          amount: "+1 250.00 BYN",
          status: "Исполнен",
        },
        {
          date: "28.05.2026",
          doc: "Платёжное поручение №123",
          counterparty: "ИП Иванов А.С.",
          amount: "-450.00 BYN",
          status: "Исполнен",
        },
        {
          date: "25.05.2026",
          doc: "Комиссия банка",
          counterparty: "БПС-Сбербанк",
          amount: "-12.50 BYN",
          status: "Списано",
        },
      ],
    },
  },
  "/money/notifications": {
    type: "table",
    table: {
      columns: [
        { key: "date", label: "Дата" },
        { key: "title", label: "Уведомление" },
        { key: "status", label: "Статус" },
      ],
      rows: [
        {
          date: "30.05.2026 14:22",
          title: "Поступление средств на счёт BY51 BPSB…2222",
          status: "Новое",
        },
        {
          date: "29.05.2026 09:15",
          title: "Документ №124 успешно исполнен",
          status: "Прочитано",
        },
        {
          date: "27.05.2026 18:40",
          title: "Напоминание: подпишите документы на подписании",
          status: "Прочитано",
        },
      ],
    },
  },
  "/money/inbox": {
    type: "table",
    toolbar: { primaryAction: "Написать в банк" },
    table: {
      columns: [
        { key: "date", label: "Дата" },
        { key: "subject", label: "Тема" },
        { key: "from", label: "От" },
      ],
      rows: [
        {
          date: "28.05.2026",
          subject: "Ответ на запрос по валютному контролю",
          from: "БПС-Сбербанк",
        },
        {
          date: "20.05.2026",
          subject: "Подтверждение подключения сервиса",
          from: "БПС-Сбербанк",
        },
      ],
    },
  },
  "/payments": {
    type: "table",
    toolbar: { primaryAction: "Создать документ", search: true, filters: ["Все", "На подписании", "Исполненные"] },
    tabs: ["Платежи", "Черновики", "Шаблоны"],
    table: {
      columns: [
        { key: "number", label: "№" },
        { key: "date", label: "Дата" },
        { key: "recipient", label: "Получатель" },
        { key: "amount", label: "Сумма", align: "right" },
        { key: "status", label: "Статус" },
      ],
      rows: [
        {
          number: "124",
          date: "30.05.2026",
          recipient: 'ООО "БелТорг"',
          amount: "1 250.00 BYN",
          status: "Исполнен",
        },
        {
          number: "125",
          date: "31.05.2026",
          recipient: "УФК по г. Минску",
          amount: "320.00 BYN",
          status: "На подписании",
        },
      ],
    },
  },
  "/payments/order": {
    type: "form",
    toolbar: { primaryAction: "Сохранить черновик" },
    form: {
      submitLabel: "Подписать и отправить",
      fields: [
        { label: "Счёт списания", type: "select", value: MOCK_ACCOUNTS[0].iban, options: MOCK_ACCOUNTS.map((a) => a.iban) },
        { label: "Получатель", placeholder: "Наименование или УНП" },
        { label: "УНП получателя", placeholder: "123456789" },
        { label: "Счёт получателя", placeholder: "BY__ BPSB ____ ____ ____ ____" },
        { label: "Сумма", placeholder: "0.00" },
        { label: "Назначение платежа", type: "textarea", placeholder: "Назначение платежа", wide: true },
      ],
    },
  },
  "/payments/currency": {
    type: "form",
    form: {
      submitLabel: "Создать перевод",
      fields: [
        { label: "Счёт списания", type: "select", value: MOCK_ACCOUNTS[2].iban, options: MOCK_ACCOUNTS.map((a) => a.iban) },
        { label: "Валюта перевода", type: "select", value: "EUR", options: ["EUR", "USD", "RUB"] },
        { label: "Сумма", placeholder: "0.00" },
        { label: "Банк получателя", placeholder: "SWIFT / наименование" },
        { label: "Счёт получателя", placeholder: "IBAN / номер счёта" },
        { label: "Назначение", type: "textarea", wide: true },
      ],
    },
  },
  "/payments/direct-debit": {
    type: "info",
    info: {
      image: "/sber-orig/images/columns-house.png",
      html: "<p>Прямое дебетование позволяет контрагентам списывать средства с вашего счёта по заранее выданному согласию.</p><p>В демо-режиме подключённые соглашения отсутствуют.</p>",
    },
  },
  "/payments/counterparties": {
    type: "table",
    toolbar: { primaryAction: "Добавить контрагента", search: true },
    table: {
      columns: [
        { key: "name", label: "Наименование" },
        { key: "unp", label: "УНП" },
        { key: "account", label: "Счёт" },
        { key: "bank", label: "Банк" },
      ],
      rows: [
        {
          name: 'ООО "БелТорг"',
          unp: "123456789",
          account: "BY12 BPSB 3012 0000 0000 0000 0001",
          bank: "БПС-Сбербанк",
        },
        {
          name: "ИП Иванов А.С.",
          unp: "987654321",
          account: "BY34 ALFA 3012 0000 0000 0000 0002",
          bank: "Альфа-Банк",
        },
      ],
    },
  },
  "/statement": {
    type: "form",
    form: {
      submitLabel: "Сформировать выписку",
      fields: [
        { label: "Счёт", type: "select", value: MOCK_ACCOUNTS[0].iban, options: MOCK_ACCOUNTS.map((a) => a.iban) },
        { label: "Период с", type: "date", value: "2026-05-01" },
        { label: "Период по", type: "date", value: "2026-05-31" },
        { label: "Формат", type: "select", value: "PDF", options: ["PDF", "1C", "Excel"] },
      ],
    },
  },
  "/statement/account": {
    type: "table",
    toolbar: { filters: [MOCK_ACCOUNTS[0].iban, "01.05.2026 — 31.05.2026"] },
    table: {
      columns: [
        { key: "date", label: "Дата" },
        { key: "operation", label: "Операция" },
        { key: "debit", label: "Дебет", align: "right" },
        { key: "credit", label: "Кредит", align: "right" },
        { key: "balance", label: "Остаток", align: "right" },
      ],
      rows: [
        { date: "01.05.2026", operation: "Входящий остаток", debit: "", credit: "", balance: "200.00" },
        { date: "28.05.2026", operation: "Списание по поручению №123", debit: "450.00", credit: "", balance: "200.00" },
        { date: "30.05.2026", operation: "Поступление по поручению №124", debit: "", credit: "1 250.00", balance: "1 450.00" },
      ],
    },
  },
  "/statement/certificates": {
    type: "cards",
    cards: [
      {
        title: "Справка об оборотах",
        description: "Подтверждение оборотов по счёту за период",
        image: "/sber-orig/images/newspaper1024.jpg",
      },
      {
        title: "Справка об отсутствии задолженности",
        description: "Для участия в тендерах и контрактах",
        image: "/sber-orig/images/columns-house.png",
      },
      {
        title: "Справка для валютного контроля",
        description: "Документы для таможни и валютного контроля",
        image: "/sber-orig/images/bag.png",
      },
    ],
  },
  "/salary": {
    type: "info",
    info: {
      image: "/sber-orig/images/cash-register.png",
      html: `<p>Зарплатный проект ${MOCK_ORG_NAME} активен.</p><p>Следующая зарплатная ведомость запланирована на 05.06.2026.</p>`,
    },
  },
  "/salary/project": {
    type: "table",
    toolbar: { primaryAction: "Создать ведомость" },
    table: {
      columns: [
        { key: "number", label: "№ ведомости" },
        { key: "date", label: "Дата" },
        { key: "employees", label: "Сотрудников" },
        { key: "amount", label: "Сумма", align: "right" },
        { key: "status", label: "Статус" },
      ],
      rows: [
        { number: "ЗВ-2026-05", date: "05.05.2026", employees: "12", amount: "18 450.00 BYN", status: "Исполнена" },
        { number: "ЗВ-2026-04", date: "05.04.2026", employees: "12", amount: "18 450.00 BYN", status: "Исполнена" },
      ],
    },
  },
  "/salary/employees": {
    type: "table",
    toolbar: { primaryAction: "Добавить сотрудника", search: true },
    table: {
      columns: [
        { key: "name", label: "ФИО" },
        { key: "position", label: "Должность" },
        { key: "account", label: "Счёт" },
        { key: "amount", label: "Оклад", align: "right" },
      ],
      rows: [
        { name: "Петров Иван Сергеевич", position: "Бухгалтер", account: "BY** **** **** ****", amount: "1 850.00" },
        { name: "Сидорова Анна Владимировна", position: "Менеджер", account: "BY** **** **** ****", amount: "2 100.00" },
        { name: "Козлов Дмитрий Алексеевич", position: "Инженер", account: "BY** **** **** ****", amount: "1 950.00" },
      ],
    },
  },
  "/salary/obligations": {
    type: "table",
    toolbar: { primaryAction: "Сформировать платёж", filters: ["Май 2026"] },
    table: {
      columns: [
        { key: "type", label: "Тип обязательства" },
        { key: "period", label: "Период" },
        { key: "amount", label: "Сумма", align: "right" },
        { key: "status", label: "Статус" },
      ],
      rows: [
        { type: "Подоходный налог", period: "05.2026", amount: "2 214.00 BYN", status: "К оплате" },
        { type: "ФСЗН", period: "05.2026", amount: "5 535.00 BYN", status: "К оплате" },
        { type: "Белгосстрах", period: "05.2026", amount: "368.00 BYN", status: "Оплачено" },
      ],
    },
  },
  "/salary/pension": {
    type: "info",
    info: {
      image: "/sber-orig/images/newspaper1024.jpg",
      html: "<p>Отчисления в фонд социальной защиты населения по зарплатному проекту.</p><p>За май 2026 начислено: <strong>5 535.00 BYN</strong>. Срок уплаты — до 15 числа месяца, следующего за отчётным.</p><p>Отчёт можно сформировать и отправить из раздела «Зарплата».</p>",
    },
  },
  "/products": {
    type: "cards",
    cards: [
      { title: "Кредиты", description: "Кредитные продукты для бизнеса", image: "/sber-orig/images/bag.png", badge: "Доступно" },
      { title: "Корпоративные карты", description: "Visa Business и Mastercard", image: "/sber-orig/images/card_without.png" },
      { title: "Депозиты", description: "Размещение свободных средств", image: "/sber-orig/images/columns-house.png" },
      { title: "Валютный контроль и ВЭД", description: "Документы и справки", image: "/sber-orig/images/bag.png" },
    ],
  },
  "/products/credits": {
    type: "cards",
    cards: [
      { title: "Овердрафт", description: "Кредитный лимит на расчётном счёте", badge: "до 50 000 BYN" },
      { title: "Инвестиционный кредит", description: "Финансирование развития бизнеса", badge: "от 8.5%" },
      { title: "Кредитная линия", description: "Возобновляемый лимит", badge: "Индивидуально" },
    ],
  },
  "/products/cards": {
    type: "table",
    toolbar: { primaryAction: "Заказать карту" },
    table: {
      columns: [
        { key: "holder", label: "Держатель" },
        { key: "number", label: "Номер карты" },
        { key: "type", label: "Тип" },
        { key: "status", label: "Статус" },
      ],
      rows: [
        { holder: "Директор", number: "•••• 4521", type: "Visa Business", status: "Активна" },
        { holder: "Бухгалтер", number: "•••• 8834", type: "Mastercard Business", status: "Активна" },
      ],
    },
  },
  "/products/deposits": {
    type: "cards",
    cards: [
      { title: "Депозит «Стандарт»", description: "Срок 3–12 месяцев, пополнение", badge: "до 7.5% годовых" },
      { title: "Депозит «Гибкий»", description: "Частичное снятие без потери процентов", badge: "до 6.8% годовых" },
    ],
  },
  "/products/ved": {
    type: "table",
    toolbar: { primaryAction: "Создать документ" },
    table: {
      columns: [
        { key: "number", label: "№ документа" },
        { key: "type", label: "Тип" },
        { key: "date", label: "Дата" },
        { key: "status", label: "Статус" },
      ],
      rows: [
        { number: "ВК-2026-012", type: "Справка о валютных операциях", date: "15.05.2026", status: "Принят" },
        { number: "ВК-2026-011", type: "Контракт для постановки на учёт", date: "02.05.2026", status: "На проверке" },
      ],
    },
  },
  "/services": {
    type: "cards",
    cards: [
      { title: "Бизнес-аналитика", description: "Отчёты и динамика оборотов", image: "/sber-orig/images/gray-circles.png" },
      { title: "Проверка контрагента", description: "Проверка по Беларуси и другим странам", image: "/sber-orig/images/ic_search.svg" },
      { title: "Кассовое обслуживание", description: "Инкассация и кассовое ПО", image: "/sber-orig/images/cash-register.png" },
      { title: "Обучение и помощь", description: "Видеокурсы и инструкции", image: "/sber-orig/images/onboardingGreeting.jpg" },
    ],
  },
  "/services/analytics": {
    type: "info",
    info: {
      image: "/sber-orig/images/gray-circles.png",
      html: "<p>Бизнес-аналитика включена в пакет услуг.</p><p>Оборот за май 2026: <strong>24 580 BYN</strong>. Динамика к апрелю: <strong>+12%</strong>.</p>",
    },
  },
  "/services/counterparty": {
    type: "form",
    form: {
      submitLabel: "Проверить",
      fields: [
        { label: "УНП или наименование", placeholder: "123456789 или ООО «Пример»" },
        { label: "Страна", type: "select", value: "Беларусь", options: ["Беларусь", "Россия", "Казахстан", "Польша"] },
      ],
    },
  },
  "/services/cash": {
    type: "info",
    info: {
      image: "/sber-orig/images/cash-register.png",
      html: "<p>Кассовое обслуживание: инкассация, аренда кассового оборудования, программное обеспечение.</p><p>Для подключения создайте заявку в разделе «Продукты и услуги».</p>",
    },
  },
  "/services/help": {
    type: "cards",
    cards: [
      { title: "Видеокурс по платежам", description: "15 минут", image: "/sber-orig/images/onboardingGreeting.jpg" },
      { title: "Инструкция по выписке", description: "PDF, 2.1 МБ", image: "/sber-orig/images/newspaper1024.jpg" },
      { title: "Частые вопросы", description: "База знаний СберБизнес", image: "/sber-orig/images/clock.png" },
    ],
  },
  "/services/exchange-rates": {
    type: "exchange",
    rates: [
      { currency: "USD", buy: "3.2150", sell: "3.2450", nbrb: "3.2280" },
      { currency: "EUR", buy: "3.4820", sell: "3.5180", nbrb: "3.5010" },
      { currency: "RUB", buy: "3.42", sell: "3.58", nbrb: "3.50" },
    ],
  },
  "/other": {
    type: "table",
    toolbar: { search: true },
    table: {
      columns: [
        { key: "name", label: "Раздел" },
        { key: "description", label: "Описание" },
      ],
      rows: [
        { name: "Документы", description: "Работа с документами организации" },
        { name: "Справочники", description: "Классификаторы и справочная информация" },
        { name: "Дополнительное меню", description: "Расширенные сервисы" },
      ],
    },
  },
  "/other/documents": {
    type: "table",
    toolbar: { primaryAction: "Создать документ", filters: ["Все типы"] },
    tabs: ["Все", "На подписании", "Архив"],
    table: {
      columns: [
        { key: "type", label: "Тип" },
        { key: "number", label: "№" },
        { key: "date", label: "Дата" },
        { key: "status", label: "Статус" },
      ],
      rows: [
        { type: "Платёжное поручение", number: "125", date: "31.05.2026", status: "На подписании" },
        { type: "Заявление", number: "З-18", date: "28.05.2026", status: "Исполнено" },
      ],
    },
  },
  "/other/documents/signing": {
    type: "table",
    toolbar: { primaryAction: "Подписать выбранные" },
    table: {
      columns: [
        { key: "type", label: "Документ" },
        { key: "number", label: "№" },
        { key: "amount", label: "Сумма", align: "right" },
        { key: "date", label: "Дата" },
      ],
      rows: [
        { type: "Платёжное поручение", number: "125", amount: "320.00 BYN", date: "31.05.2026" },
      ],
    },
  },
  "/other/directories": {
    type: "cards",
    cards: [
      { title: "Коды назначения платежей", description: "Справочник кодов" },
      { title: "Банки Республики Беларусь", description: "БИК и реквизиты" },
      { title: "Страны и валюты", description: "Классификатор ISO" },
    ],
  },
  "/other/more": {
    type: "cards",
    cards: [
      { title: "Тарифы", description: "Пакеты услуг и комиссии" },
      { title: "Офисы и банкоматы", description: "Карта отделений" },
      { title: "Мобильное приложение", description: "СберБизнес для смартфона", image: "/sber-orig/images/appIcon512.png" },
    ],
  },
  "/settings": {
    type: "profile",
    info: {
      html: `<p><strong>${MOCK_ORG_NAME}</strong></p><p>УНП: 123456789</p><p>Последний вход: 31.05.2026, 09:42</p>`,
    },
  },
  "/settings/accounts": {
    type: "table",
    table: {
      columns: [
        { key: "iban", label: "Счёт" },
        { key: "type", label: "Тип" },
        { key: "visible", label: "Отображение" },
        { key: "order", label: "Порядок" },
      ],
      rows: MOCK_ACCOUNTS.map((a, i) => ({
        iban: a.iban,
        type: a.type,
        visible: "Отображается",
        order: String(i + 1),
      })),
    },
  },
  "/settings/security": {
    type: "cards",
    cards: [
      { title: "Смена пароля", description: "Последняя смена: 01.03.2026" },
      { title: "Электронная подпись", description: "Ключ действителен до 15.12.2026" },
      { title: "Двухфакторная аутентификация", description: "SMS-подтверждение включено", badge: "Активно" },
    ],
  },
};

export function getSyntheticPageBody(path: string): SyntheticPageBody | null {
  return SYNTHETIC_PAGE_BODIES[path] ?? null;
}
