import type { NavId } from "./navigation";

export interface PageMeta {
  title: string;
  description: string;
  navId: NavId;
}

export const PAGE_META: Record<string, PageMeta> = {
  "/money/movements": {
    title: "Движение по счетам",
    description: "История операций и событий по расчётным счетам.",
    navId: "moneyAndEvents",
  },
  "/money/notifications": {
    title: "Уведомления",
    description: "Системные и банковские уведомления.",
    navId: "moneyAndEvents",
  },
  "/money/inbox": {
    title: "Входящие письма",
    description: "Переписка с банком.",
    navId: "moneyAndEvents",
  },
  "/payments/order": {
    title: "Платежное поручение",
    description: "Создание и отправка платёжных поручений.",
    navId: "payments",
  },
  "/payments/currency": {
    title: "Валютный перевод",
    description: "Переводы в иностранной валюте.",
    navId: "payments",
  },
  "/payments/direct-debit": {
    title: "Прямое дебетование счета",
    description: "Настройка прямого дебетования.",
    navId: "payments",
  },
  "/payments/counterparties": {
    title: "Контрагенты",
    description: "Справочник контрагентов организации.",
    navId: "payments",
  },
  "/statement/account": {
    title: "Выписка по счету",
    description: "Формирование выписки по выбранному счёту.",
    navId: "statement",
  },
  "/statement/certificates": {
    title: "Справки",
    description: "Заказ справок и подтверждающих документов.",
    navId: "statement",
  },
  "/salary/project": {
    title: "Зарплатный проект",
    description: "Управление зарплатным проектом.",
    navId: "salary",
  },
  "/salary/employees": {
    title: "Сотрудники",
    description: "Список сотрудников и реквизиты для выплат.",
    navId: "salary",
  },
  "/salary/obligations": {
    title: "Обязательства",
    description: "Налоги, взносы и обязательные платежи по зарплатному проекту.",
    navId: "salary",
  },
  "/salary/pension": {
    title: "Пенсионные отчисления",
    description: "Отчисления в фонд социальной защиты и отчётность.",
    navId: "salary",
  },
  "/products/credits": {
    title: "Кредиты",
    description: "Кредитные продукты для бизнеса.",
    navId: "productsAndServices",
  },
  "/products/cards": {
    title: "Корпоративные карты",
    description: "Корпоративные платёжные карты.",
    navId: "productsAndServices",
  },
  "/products/corpo-card-transfers": {
    title: "Переводы на корпоративные карты",
    description: "Пополнение карточных счетов корпоративных карт.",
    navId: "productsAndServices",
  },
  "/products/deposits": {
    title: "Депозиты",
    description: "Депозитные продукты.",
    navId: "productsAndServices",
  },
  "/products/ved": {
    title: "Валютный контроль и ВЭД",
    description: "Документы валютного контроля и ВЭД.",
    navId: "productsAndServices",
  },
  "/services/analytics": {
    title: "Бизнес-аналитика",
    description: "Отчёты и аналитика по оборотам.",
    navId: "partner-services",
  },
  "/services/counterparty": {
    title: "Проверка контрагента",
    description: "Сервис проверки контрагентов.",
    navId: "partner-services",
  },
  "/services/cash": {
    title: "Кассовое обслуживание",
    description: "Кассовые операции и инкассация.",
    navId: "partner-services",
  },
  "/services/help": {
    title: "Обучение и помощь",
    description: "Материалы и инструкции по работе в системе.",
    navId: "partner-services",
  },
  "/services/exchange-rates": {
    title: "Курсы валют",
    description: "Актуальные курсы валют банка.",
    navId: "partner-services",
  },
  "/other/info-requests": {
    title: "Запросы выписки, информации",
    description: "Запросы выписки и справочной информации по счетам и операциям.",
    navId: "other",
  },
  "/other/documents": {
    title: "Документы",
    description: "Работа с документами организации.",
    navId: "other",
  },
  "/other/documents/signing": {
    title: "Документы на подписании",
    description: "Документы, ожидающие подписи.",
    navId: "other",
  },
  "/other/directories": {
    title: "Справочники",
    description: "Справочная информация и классификаторы.",
    navId: "other",
  },
  "/other/more": {
    title: "Дополнительное меню",
    description: "Дополнительные сервисы и разделы.",
    navId: "other",
  },
  "/settings/accounts": {
    title: "Настройка счетов",
    description: "Отображение и группировка счетов.",
    navId: "user-account",
  },
  "/settings/security": {
    title: "Безопасность",
    description: "Пароль, ключи и параметры безопасности.",
    navId: "user-account",
  },
};

export function getPageMeta(path: string): PageMeta | null {
  return PAGE_META[path] ?? null;
}
