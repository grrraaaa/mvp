/** 3D-карта и ссылки на разделы https://www.sber-bank.by (проверены curl, май 2026) */

import {
  SBER_BY_BASE,
  VERIFIED_PRODUCT_URLS,
  VERIFIED_SECTION_URLS,
} from "./verifiedLinks";

export { SBER_BY_BASE };

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

export const SBER_SUN = {
  label: "Сбер",
  url: SBER_BY_BASE,
  hint: "Официальный сайт ОАО «Сбер Банк» — Беларусь",
};

export const ORBIT_PLANETS: PlanetDef[] = [
  {
    id: "cards",
    label: "Карты",
    url: VERIFIED_SECTION_URLS.cards,
    hint: "Платёжные карты, стикер, СберПрайм, «Спасибо»",
    color: "#5eb8ff",
    emissive: "#1a6bb8",
    orbitRadius: 9.5,
    orbitSpeed: 0.055,
    startAngle: 0,
    satellites: [
      {
        label: "Карты",
        url: VERIFIED_SECTION_URLS.cards,
        hint: "Платёжные карты и доставка",
      },
      {
        label: "Прайм",
        url: VERIFIED_PRODUCT_URLS.loyalty_program,
        hint: "СберПрайм — программа привилегий",
      },
    ],
  },
  {
    id: "deposits",
    label: "Депозиты",
    url: VERIFIED_SECTION_URLS.deposits,
    hint: "Вклады в BYN и валюте, «Копилка», металлические счета",
    color: "#ffd54f",
    emissive: "#b8860b",
    orbitRadius: 13.5,
    orbitSpeed: 0.045,
    startAngle: 1.05,
    satellites: [
      {
        label: "Сберегай",
        url: VERIFIED_PRODUCT_URLS.deposit_save,
        hint: "Безотзывный вклад «Сберегай»",
      },
      {
        label: "Копилка",
        url: VERIFIED_PRODUCT_URLS.deposit_kopilka,
        hint: "Онлайн-сервис накоплений",
      },
    ],
  },
  {
    id: "credits",
    label: "Кредиты",
    url: VERIFIED_SECTION_URLS.credits,
    hint: "Авто, онлайн-кредиты, рефинансирование",
    color: "#ff8a65",
    emissive: "#c43e00",
    orbitRadius: 17.5,
    orbitSpeed: 0.04,
    startAngle: 2.1,
    satellites: [
      {
        label: "Online",
        url: VERIFIED_PRODUCT_URLS.credit_online,
        hint: "Кредит «Просто в Online»",
      },
      {
        label: "Авто",
        url: VERIFIED_PRODUCT_URLS.credit_auto,
        hint: "Автокредиты и LADA",
      },
      {
        label: "Рефин.",
        url: VERIFIED_PRODUCT_URLS.credit_refinance,
        hint: "Рефинансирование в Online",
      },
    ],
  },
  {
    id: "investments",
    label: "Инвест.",
    url: VERIFIED_SECTION_URLS.investments,
    hint: "Облигации, монеты, брокер, доверительное управление",
    color: "#b39ddb",
    emissive: "#5e35b1",
    orbitRadius: 21.5,
    orbitSpeed: 0.035,
    startAngle: 3.2,
    satellites: [
      {
        label: "Облигации",
        url: VERIFIED_PRODUCT_URLS.invest_bonds,
        hint: "Облигации банка и юрлиц",
      },
      {
        label: "Монеты",
        url: VERIFIED_PRODUCT_URLS.invest_coins,
        hint: "Инвестиционные монеты",
      },
    ],
  },
  {
    id: "insurance",
    label: "Страхов.",
    url: VERIFIED_SECTION_URLS.insurance,
    hint: "Страхование имущества, жизни, карт",
    color: "#80cbc4",
    emissive: "#00695c",
    orbitRadius: 25.5,
    orbitSpeed: 0.0325,
    startAngle: 4.1,
    satellites: [
      {
        label: "Имущество",
        url: VERIFIED_SECTION_URLS.insurance,
        hint: "Страхование имущества онлайн",
      },
      {
        label: "Кредит",
        url: VERIFIED_PRODUCT_URLS.insurance_credit,
        hint: "Страхование рисков кредитополучателей",
      },
      {
        label: "Жизнь",
        url: VERIFIED_PRODUCT_URLS.insurance_life,
        hint: "Страхование жизни и здоровья",
      },
    ],
  },
  {
    id: "payments",
    label: "Платежи",
    url: VERIFIED_SECTION_URLS.payments,
    hint: "Переводы, ERIP, международные платежи",
    color: "#a5d6a7",
    emissive: "#2e7d32",
    orbitRadius: 29.5,
    orbitSpeed: 0.0275,
    startAngle: 5.0,
    satellites: [
      {
        label: "Переводы",
        url: VERIFIED_PRODUCT_URLS.payments_transfers,
        hint: "По номеру телефона и внутри РБ",
      },
      {
        label: "ERIP",
        url: VERIFIED_PRODUCT_URLS.payments_erip,
        hint: "Приём платежей и сервисы",
      },
    ],
  },
];

export function collectHighlightUrls(paths: string[] | undefined): Set<string> {
  const set = new Set<string>();
  if (!paths?.length) return set;
  for (const u of paths) {
    set.add(u.replace(/\/$/, ""));
    try {
      const parsed = new URL(u);
      set.add(`${parsed.origin}${parsed.pathname}`.replace(/\/$/, ""));
    } catch {
      /* relative or invalid */
    }
  }
  return set;
}

export function isUrlHighlighted(url: string, active: Set<string>): boolean {
  if (active.size === 0) return false;
  const norm = url.replace(/\/$/, "");
  if (active.has(norm)) return true;
  for (const a of active) {
    if (norm.startsWith(a) || a.startsWith(norm)) return true;
  }
  return false;
}
