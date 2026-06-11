"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { fetchExchangeRates } from "@/lib/api/banking";
import {
  convertFxAmount,
  formatFxRate,
  formatFxResult,
  type FxCurrency,
  type FxRateRow,
} from "@/lib/banking/exchangeRates";

const FALLBACK_RATES: FxRateRow[] = [
  { code: "USD", pair: "USD/BYN", scale: 1, buy: 3.22, sell: 3.265, nbrb: 3.2425 },
  { code: "EUR", pair: "EUR/BYN", scale: 1, buy: 3.49, sell: 3.545, nbrb: 3.5175 },
  { code: "RUB", pair: "RUB/BYN", scale: 100, buy: 3.41, sell: 3.48, nbrb: 3.445 },
];

type Props = {
  compact?: boolean;
  showNbrb?: boolean;
  className?: string;
};

export function ExchangeRatesWidget({
  compact = false,
  showNbrb = false,
  className = "",
}: Props) {
  const [rates, setRates] = useState<FxRateRow[]>(FALLBACK_RATES);
  const [source, setSource] = useState<"nbrb" | "demo">("demo");
  const [rateDate, setRateDate] = useState<string | null>("2026-05-31");
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [calcAmount, setCalcAmount] = useState("100");
  const [fromCurr, setFromCurr] = useState<FxCurrency>("USD");
  const [toCurr, setToCurr] = useState<FxCurrency>("BYN");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchExchangeRates()
      .then((data) => {
        if (cancelled) return;
        setRates(data.rates);
        setSource(data.source);
        setRateDate(data.rate_date);
        setUpdatedAt(data.updated_at);
      })
      .catch(() => {
        if (!cancelled) {
          setRates(FALLBACK_RATES);
          setSource("demo");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo(() => {
    const amt = parseFloat(calcAmount.replace(",", "."));
    if (!Number.isFinite(amt)) return "0.00";
    return formatFxResult(convertFxAmount(amt, fromCurr, toCurr, rates), toCurr);
  }, [calcAmount, fromCurr, toCurr, rates]);

  const footer = rateDate
    ? `Курсы на ${rateDate}${updatedAt ? `, обновлены в ${updatedAt}` : ""}${
        source === "nbrb" ? " (НБРБ + спред банка)" : " (демо)"
      }`
    : "Курсы ориентировочные";

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-150 shadow-xs p-5 space-y-4 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-gray-150 pb-2">
        <ArrowRightLeft className="w-4.5 h-4.5 text-[#138d8a]" />
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">
          Курсы валют ОАО «Сбер Банк»
        </h4>
        {loading && (
          <span className="text-[10px] text-gray-400 ml-auto">загрузка…</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[280px]">
          <thead>
            <tr className="text-gray-400 font-bold">
              <th className="text-left py-1 pr-2">Валюта</th>
              <th className="text-right py-1 px-2 text-[#138d8a]">Покупка</th>
              <th className="text-right py-1 pl-2 text-amber-600">Продажа</th>
              {showNbrb && <th className="text-right py-1 pl-2 text-gray-500">НБРБ</th>}
            </tr>
          </thead>
          <tbody>
            {rates.map((row) => (
              <tr key={row.code} className="border-t border-gray-100">
                <td className="py-2 pr-2 font-extrabold text-gray-700">
                  {row.pair}
                  {row.scale > 1 ? (
                    <span className="block text-[10px] font-medium text-gray-400">
                      за {row.scale} {row.code}
                    </span>
                  ) : null}
                </td>
                <td className="py-2 px-2 text-right font-black text-[#138d8a]">
                  {formatFxRate(row.buy, row.scale)}
                </td>
                <td className="py-2 pl-2 text-right font-black text-amber-600">
                  {formatFxRate(row.sell, row.scale)}
                </td>
                {showNbrb && (
                  <td className="py-2 pl-2 text-right font-semibold text-gray-500">
                    {formatFxRate(row.nbrb, row.scale)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`space-y-3 ${compact ? "pt-1" : "pt-2"}`}>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
          Калькулятор конверсии
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            step="any"
            value={calcAmount}
            onChange={(e) => setCalcAmount(e.target.value)}
            placeholder="Сумма"
            className="flex-1 min-w-[80px] border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#138d8a] focus:border-[#138d8a] font-black text-gray-800"
          />

          <select
            value={fromCurr}
            onChange={(e) => setFromCurr(e.target.value as FxCurrency)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-gray-700 focus:ring-1 focus:ring-[#138d8a]"
          >
            <option value="BYN">BYN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="RUB">RUB</option>
          </select>

          <span className="text-gray-400 text-xs font-black" aria-hidden>
            →
          </span>

          <select
            value={toCurr}
            onChange={(e) => setToCurr(e.target.value as FxCurrency)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-gray-700 focus:ring-1 focus:ring-[#138d8a]"
          >
            <option value="BYN">BYN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="RUB">RUB</option>
          </select>
        </div>

        <div className="bg-emerald-50/55 p-2 rounded-lg border border-emerald-100 text-right text-xs">
          <span className="text-emerald-700 font-medium mr-1.5">
            Результат (ориентировочно):
          </span>
          <span className="font-extrabold text-emerald-900 text-sm">
            {result} {toCurr}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 leading-snug">{footer}</p>
    </div>
  );
}
