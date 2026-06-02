/** 3D-карта разделов СберБизнес (внутренние маршруты демо). */

export interface SatelliteDef {
  label: string;
  url: string;
  hint: string;
}

export interface PlanetDef {
  id: string;
  label: string;
  url: string;
  hint: string;
  color: string;
  emissive: string;
  orbitRadius: number;
  orbitSpeed: number;
  startAngle: number;
  satellites: SatelliteDef[];
}

export const SBBOL_SUN = {
  label: "СберБизнес",
  url: "/",
  hint: "Главная — деньги и события по счетам организации",
};

export const ORBIT_PLANETS: PlanetDef[] = [
  {
    id: "payments",
    label: "Расчёты",
    url: "/payments",
    hint: "Платежи, переводы, контрагенты, создание документов",
    color: "#5eb8ff",
    emissive: "#1a6bb8",
    orbitRadius: 9.5,
    orbitSpeed: 0.055,
    startAngle: 0,
    satellites: [
      { label: "Поручение", url: "/payments/paydocbyn", hint: "Платёжное поручение BYN" },
      { label: "Контрагенты", url: "/payments/counterparties", hint: "Справочник контрагентов" },
    ],
  },
  {
    id: "statement",
    label: "Выписка",
    url: "/statement",
    hint: "Выписка по счёту, справки для бизнеса",
    color: "#80cbc4",
    emissive: "#00695c",
    orbitRadius: 13.5,
    orbitSpeed: 0.045,
    startAngle: 0.9,
    satellites: [
      { label: "По счёту", url: "/statement/account", hint: "Движение и остатки" },
      { label: "Справки", url: "/statement/certificates", hint: "Заказ справок" },
    ],
  },
  {
    id: "salary",
    label: "Зарплата",
    url: "/salary",
    hint: "Зарплатный проект и выплаты сотрудникам",
    color: "#ffd54f",
    emissive: "#b8860b",
    orbitRadius: 17.5,
    orbitSpeed: 0.04,
    startAngle: 1.8,
    satellites: [
      { label: "Проект", url: "/salary/project", hint: "Зарплатные ведомости" },
      { label: "Сотрудники", url: "/salary/employees", hint: "Список сотрудников" },
    ],
  },
  {
    id: "products",
    label: "Продукты",
    url: "/products",
    hint: "Кредиты, депозиты, карты, ВЭД для организации",
    color: "#ff8a65",
    emissive: "#c43e00",
    orbitRadius: 21.5,
    orbitSpeed: 0.035,
    startAngle: 2.7,
    satellites: [
      { label: "Кредиты", url: "/products/credits", hint: "Овердрафт и кредитная линия" },
      { label: "Депозиты", url: "/products/deposits", hint: "Размещение средств" },
      { label: "Карты", url: "/products/cards", hint: "Корпоративные карты" },
    ],
  },
  {
    id: "services",
    label: "Сервисы",
    url: "/services",
    hint: "Аналитика, проверка контрагента, курсы валют",
    color: "#b39ddb",
    emissive: "#5e35b1",
    orbitRadius: 25.5,
    orbitSpeed: 0.0325,
    startAngle: 3.6,
    satellites: [
      { label: "Аналитика", url: "/services/analytics", hint: "Обороты и отчёты" },
      { label: "Курсы", url: "/services/exchange-rates", hint: "Курсы валют банка" },
    ],
  },
  {
    id: "other",
    label: "Прочее",
    url: "/other",
    hint: "Документы, справочники, подписание",
    color: "#a5d6a7",
    emissive: "#2e7d32",
    orbitRadius: 29.5,
    orbitSpeed: 0.0275,
    startAngle: 4.5,
    satellites: [
      { label: "На подписании", url: "/other/documents/signing", hint: "Документы к подписи" },
      { label: "Справочники", url: "/other/directories", hint: "Коды и классификаторы" },
    ],
  },
  {
    id: "settings",
    label: "Настройки",
    url: "/settings",
    hint: "Профиль организации, счета, безопасность",
    color: "#90caf9",
    emissive: "#1565c0",
    orbitRadius: 33.5,
    orbitSpeed: 0.024,
    startAngle: 5.4,
    satellites: [
      { label: "Счета", url: "/settings/accounts", hint: "Отображение счетов" },
      { label: "Безопасность", url: "/settings/security", hint: "Пароль и ЭЦП" },
    ],
  },
];

/** @deprecated use SBBOL_SUN */
export const SBER_SUN = SBBOL_SUN;

export function collectHighlightUrls(paths: string[] | undefined): Set<string> {
  const set = new Set<string>();
  if (!paths?.length) return set;
  for (const u of paths) {
    const norm = u.split("?")[0].replace(/\/$/, "") || "/";
    set.add(norm);
    if (u.startsWith("http")) {
      try {
        const parsed = new URL(u);
        set.add(`${parsed.origin}${parsed.pathname}`.replace(/\/$/, "") || "/");
      } catch {
        /* ignore */
      }
    }
  }
  return set;
}

export function isUrlHighlighted(url: string, active: Set<string>): boolean {
  if (active.size === 0) return false;
  const norm = url.split("?")[0].replace(/\/$/, "") || "/";
  if (active.has(norm)) return true;
  for (const a of active) {
    if (a === "/") continue;
    if (norm.startsWith(a) || a.startsWith(norm)) return true;
  }
  return false;
}

/** Планеты для горизонтального слайдера (солнце + орбиты). */
export const SBBOL_SLIDER_ITEMS = [
  { id: "home", label: "Главная", href: "/", color: "#21A038", emissive: "#107f8c" },
  ...ORBIT_PLANETS.map((p) => ({
    id: p.id,
    label: p.label,
    href: p.url,
    color: p.color,
    emissive: p.emissive,
  })),
];
