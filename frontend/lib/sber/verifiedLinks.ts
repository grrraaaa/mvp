/** Проверенные URL sber-bank.by (curl 200, май 2026). Синхронизировано с backend/services/verified_links.json */

export const SBER_BY_BASE = "https://www.sber-bank.by";

export const VERIFIED_SECTION_URLS: Record<string, string> = {
  home: SBER_BY_BASE,
  cards: `${SBER_BY_BASE}/cards/filter`,
  deposits: `${SBER_BY_BASE}/deposit/save-online-BYN-unrecall-capital/BYN/attributes`,
  credits: `${SBER_BY_BASE}/credit`,
  investments: `${SBER_BY_BASE}/investicii/monety`,
  insurance: `${SBER_BY_BASE}/insurance/property-insurance-online/conditions`,
  payments: `${SBER_BY_BASE}/denezhnye-perevody`,
  sbol: `${SBER_BY_BASE}/loginsbol`,
};

export const VERIFIED_PRODUCT_URLS: Record<string, string> = {
  credit_online: `${SBER_BY_BASE}/credit-potreb/prosto-v-online/conditions`,
  credit_auto: `${SBER_BY_BASE}/credit-auto/buy-lada/conditions`,
  credit_refinance: `${SBER_BY_BASE}/credit-potreb/refinance-online/conditions`,
  deposit_save: `${SBER_BY_BASE}/deposit/save-online-BYN-unrecall-capital/BYN/attributes`,
  deposit_kopilka: `${SBER_BY_BASE}/page/kopilka`,
  invest_bonds: `${SBER_BY_BASE}/page/obligacii-banka`,
  invest_coins: `${SBER_BY_BASE}/investicii/monety`,
  card_payment: `${SBER_BY_BASE}/cards/filter`,
  loyalty_program: `${SBER_BY_BASE}/loyalty-program`,
  insurance_life: `${SBER_BY_BASE}/insurance/accidents-insurance/conditions`,
  insurance_credit: `${SBER_BY_BASE}/insurance/credit-insurance-online/conditions`,
  payments_transfers: `${SBER_BY_BASE}/denezhnye-perevody/po-belarusi`,
  payments_erip: `${SBER_BY_BASE}/denezhnye-perevody/instant-payment-system`,
};

const ALLOWED = new Set<string>([
  ...Object.values(VERIFIED_SECTION_URLS),
  ...Object.values(VERIFIED_PRODUCT_URLS),
  `${SBER_BY_BASE}/person`,
]);

export function isVerifiedSberUrl(url: string): boolean {
  const norm = url.replace(/\/$/, "");
  return ALLOWED.has(norm);
}

export function sanitizeSberUrl(url: string): string {
  const norm = url.replace(/\/$/, "");
  return isVerifiedSberUrl(norm) ? norm : SBER_BY_BASE;
}
