export type NavId =
  | "moneyAndEvents"
  | "payments"
  | "statement"
  | "salary"
  | "productsAndServices"
  | "partner-services"
  | "other"
  | "user-account";

export interface NavItem {
  id: NavId;
  label: string;
  href: string;
  twoLines?: boolean;
}

export interface SubNavItem {
  label: string;
  href: string;
  description?: string;
}

export const MAIN_NAV: NavItem[] = [
  { id: "moneyAndEvents", label: "Деньги и события", href: "/" },
  { id: "payments", label: "Расчеты", href: "/payments" },
  { id: "statement", label: "Выписка", href: "/statement" },
  { id: "salary", label: "Зарплата", href: "/salary" },
  { id: "productsAndServices", label: "Продукты и услуги", href: "/products", twoLines: true },
  { id: "partner-services", label: "Сервисы", href: "/services" },
  { id: "other", label: "Прочее", href: "/other" },
  { id: "user-account", label: "Настройки", href: "/settings" },
];

export const SUB_NAV: Record<NavId, SubNavItem[]> = {
  moneyAndEvents: [
    { label: "Главная", href: "/", description: "Сводка по счетам и событиям" },
    { label: "Движение по счетам", href: "/money/movements" },
    { label: "Уведомления", href: "/money/notifications" },
    { label: "Входящие письма", href: "/money/inbox" },
  ],
  payments: [
    { label: "Платежи и переводы", href: "/payments" },
    { label: "Платежное поручение", href: "/payments/order" },
    { label: "Валютный перевод", href: "/payments/currency" },
    { label: "Прямое дебетование счета", href: "/payments/direct-debit" },
    { label: "Контрагенты", href: "/payments/counterparties" },
  ],
  statement: [
    { label: "Выписка", href: "/statement" },
    { label: "Выписка по счету", href: "/statement/account" },
    { label: "Справки", href: "/statement/certificates" },
  ],
  salary: [
    { label: "Зарплата", href: "/salary" },
    { label: "Зарплатный проект", href: "/salary/project" },
    { label: "Сотрудники", href: "/salary/employees" },
  ],
  productsAndServices: [
    { label: "Кредиты", href: "/products/credits" },
    { label: "Корпоративные карты", href: "/products/cards" },
    { label: "Депозиты", href: "/products/deposits" },
    { label: "Валютный контроль и ВЭД", href: "/products/ved" },
    { label: "Карта услуг", href: "/products/map" },
  ],
  "partner-services": [
    { label: "Бизнес-аналитика", href: "/services/analytics" },
    { label: "Проверка контрагента", href: "/services/counterparty" },
    { label: "Кассовое обслуживание", href: "/services/cash" },
    { label: "Обучение и помощь", href: "/services/help" },
  ],
  other: [
    { label: "Документы", href: "/other/documents" },
    { label: "Справочники", href: "/other/directories" },
    { label: "Дополнительное меню", href: "/other/more" },
  ],
  "user-account": [
    { label: "Ваш профиль", href: "/settings" },
    { label: "Настройка счетов", href: "/settings/accounts" },
    { label: "Безопасность", href: "/settings/security" },
  ],
};

export const DASHBOARD_QUICK_LINKS = [
  { label: "Документы на\u00a0подписании", href: "/other/documents/signing" },
  { label: "Кредиты", href: "/products/credits" },
  { label: "Корпоративные карты", href: "/products/cards" },
  { label: "Контрагенты", href: "/payments/counterparties" },
  { label: "Сотрудники", href: "/salary/employees" },
  { label: "Курсы валют", href: "/services/exchange-rates" },
];

export function navIdFromPath(pathname: string): NavId {
  const entry = MAIN_NAV.find((n) =>
    n.href === "/" ? pathname === "/" : pathname === n.href || pathname.startsWith(`${n.href}/`)
  );
  if (entry) return entry.id;
  for (const [id, items] of Object.entries(SUB_NAV) as [NavId, SubNavItem[]][]) {
    if (items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))) return id;
  }
  return "moneyAndEvents";
}
