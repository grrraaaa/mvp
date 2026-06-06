/** Каталог продуктов и услуг — маршруты и подсказки для ассистента. */

export interface ProductItem {
  slug: string;
  label: string;
  category: string;
  assistantAction: string;
  assistantLabels: string[];
  /** documents = список документов; landing = форма/заявка */
  pageType: "documents" | "landing";
  docType?: string;
}

export const CORP_CARD_DOC_TYPE = "PAY_DOC_CORPO_CARD";
export const CORP_CARD_IBAN = "BY83 BPSB 3012 8888 8888 0933 0000";

export const PRODUCT_CATALOG: ProductItem[] = [
  {
    slug: "corpo-card-transfers",
    label: "Переводы на корпоративные карты",
    category: "Корпоративные карты",
    assistantAction: "open-corpo-card-transfers",
    assistantLabels: ["перевод на корпоративн", "переводы на корпоративн", "pay_doc_corpo_card", "пополнение карточного"],
    pageType: "documents",
    docType: CORP_CARD_DOC_TYPE,
  },
  {
    slug: "card-order",
    label: "Получение корпоративной карты / бизнес-карты",
    category: "Корпоративные карты",
    assistantAction: "open-card-order",
    assistantLabels: ["получение корпоративн", "бизнес-карт", "заказ карт"],
    pageType: "landing",
  },
  {
    slug: "card-proxy",
    label: "Доверенность на получение / возврат корпоративных карт",
    category: "Корпоративные карты",
    assistantAction: "open-card-proxy",
    assistantLabels: ["доверенность", "получение карт", "возврат карт"],
    pageType: "landing",
  },
  {
    slug: "card-management",
    label: "Управление картами",
    category: "Корпоративные карты",
    assistantAction: "open-cards",
    assistantLabels: ["управление карт", "лимит карт", "блокировк карт"],
    pageType: "landing",
  },
  {
    slug: "deposit-open",
    label: "Открытие депозита",
    category: "Депозиты",
    assistantAction: "open-deposit-open",
    assistantLabels: ["открытие депозит", "открыть депозит"],
    pageType: "landing",
  },
  {
    slug: "deposit-refill",
    label: "Пополнение / возврат депозита (процентов)",
    category: "Депозиты",
    assistantAction: "open-deposit-refill",
    assistantLabels: ["пополнение депозит", "возврат депозит", "процентов депозит"],
    pageType: "landing",
  },
  {
    slug: "deposit-calculator",
    label: "Депозитный калькулятор",
    category: "Депозиты",
    assistantAction: "open-deposits",
    assistantLabels: ["депозитный калькулятор", "калькулятор депозит"],
    pageType: "landing",
  },
  {
    slug: "tariff-change",
    label: "Смена (подключение) пакета услуг",
    category: "Ведение счетов",
    assistantAction: "open-tariff-change",
    assistantLabels: ["пакет услуг", "тариф", "смена пакета"],
    pageType: "landing",
  },
  {
    slug: "account-open",
    label: "Открытие счета",
    category: "Ведение счетов",
    assistantAction: "open-account-open",
    assistantLabels: ["открытие счета", "открыть счет", "новый счет"],
    pageType: "landing",
  },
  {
    slug: "account-certificate",
    label: "Запрос справки",
    category: "Ведение счетов",
    assistantAction: "open-account-certificate",
    assistantLabels: ["запрос справк", "справка счета"],
    pageType: "landing",
  },
  {
    slug: "product-request",
    label: "Заявка на предоставление продукта (услуги)",
    category: "Прочие продукты и услуги",
    assistantAction: "open-product-request",
    assistantLabels: ["заявка на продукт", "предоставление продукта"],
    pageType: "landing",
  },
  {
    slug: "self-collection",
    label: 'Доступ к услуге "Самоинкассация"',
    category: "Прочие продукты и услуги",
    assistantAction: "open-self-collection",
    assistantLabels: ["самоинкассац"],
    pageType: "landing",
  },
  {
    slug: "acquiring-register",
    label: "Регистрация пункта обслуживания и терминалов",
    category: "Эквайринг",
    assistantAction: "open-acquiring-register",
    assistantLabels: ["регистрация пункта", "терминал", "эквайринг"],
    pageType: "landing",
  },
  {
    slug: "acquiring-changes",
    label: "Внесение изменений по эквайрингу",
    category: "Эквайринг",
    assistantAction: "open-acquiring-changes",
    assistantLabels: ["изменения по эквайринг"],
    pageType: "landing",
  },
  {
    slug: "acquiring-points",
    label: "Пункты обслуживания и терминалы",
    category: "Эквайринг",
    assistantAction: "open-acquiring-points",
    assistantLabels: ["пункты обслуживания", "pos терминал"],
    pageType: "landing",
  },
  {
    slug: "marketplace",
    label: "Вход на торговую площадку (веб-версия)",
    category: "Торговая площадка",
    assistantAction: "open-marketplace",
    assistantLabels: ["торговая площадка", "сбер торги"],
    pageType: "landing",
  },
];

export function getProductBySlug(slug: string): ProductItem | undefined {
  return PRODUCT_CATALOG.find((p) => p.slug === slug);
}

export function productHref(slug: string): string {
  return `/products/${slug}`;
}

export const PRODUCT_ROUTES: Record<string, string> = Object.fromEntries(
  PRODUCT_CATALOG.map((p) => [p.assistantAction, productHref(p.slug)]),
);
