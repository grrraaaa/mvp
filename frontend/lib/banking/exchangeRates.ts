/** Курсы валют и калькулятор конверсии (логика как в кассе банка). */

export type FxCurrency = "BYN" | "USD" | "EUR" | "RUB";

export interface FxRateRow {
  code: Exclude<FxCurrency, "BYN">;
  pair: string;
  scale: number;
  buy: number;
  sell: number;
  nbrb: number;
}

export interface ExchangeRatesPayload {
  rates: FxRateRow[];
  source: "nbrb" | "demo";
  rate_date: string | null;
  updated_at: string;
  disclaimer?: string;
}

export function formatFxRate(value: number, scale: number): string {
  const digits = scale > 1 ? 4 : 4;
  return value.toFixed(digits);
}

/** BYN за `scale` единиц валюты при продаже валюты банку (курс покупки). */
export function foreignToByn(amount: number, row: FxRateRow): number {
  return (amount / row.scale) * row.buy;
}

/** Сколько валюты получит клиент за BYN (курс продажи банка). */
export function bynToForeign(amountByn: number, row: FxRateRow): number {
  return (amountByn / row.sell) * row.scale;
}

/**
 * Конвертация с учётом направления:
 * - в BYN: клиент продаёт иностранную валюту → buy
 * - из BYN: клиент покупает иностранную валюту → sell
 * - FX→FX: через BYN (продажа исходной, покупка целевой)
 */
export function convertFxAmount(
  amount: number,
  from: FxCurrency,
  to: FxCurrency,
  rows: FxRateRow[],
): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  if (from === to) return amount;

  const map = Object.fromEntries(rows.map((r) => [r.code, r])) as Record<
    Exclude<FxCurrency, "BYN">,
    FxRateRow
  >;

  let byn: number;
  if (from === "BYN") {
    byn = amount;
  } else {
    byn = foreignToByn(amount, map[from]);
  }

  if (to === "BYN") {
    return byn;
  }
  return bynToForeign(byn, map[to]);
}

export function formatFxResult(value: number, currency: FxCurrency): string {
  if (currency === "RUB") return value.toFixed(2);
  if (currency === "BYN") return value.toFixed(2);
  return value.toFixed(2);
}
