"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconMoreVertical,
  IconRefresh,
  IconSettings,
  QuickLinkIcon,
} from "@/components/sbbol/SbbolIcons";
import { PROMO_BANNERS } from "@/lib/sbbol/mockSbbolData";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import { DASHBOARD_QUICK_LINKS } from "@/lib/sbbol/navigation";
import { showStubToast } from "@/lib/sbbol/stubToast";
import { useBankingStore } from "@/store/bankingStore";
import { useAuthStore } from "@/store/authStore";
import { fetchBalanceSummary, type BalanceHistoryMonth } from "@/lib/api/banking";

export function DashboardHome() {
  const { openDocumentModal } = useSbbolUi();
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(true);
  const banner = PROMO_BANNERS[bannerIndex];

  const accounts = useBankingStore((s) => s.accounts);
  const loadAll = useBankingStore((s) => s.loadAll);
  const orgName = useAuthStore((s) => s.user?.org_name) ?? "DEMO ЮРИДИЧЕСКОЕ ЛИЦО";

  // Реальные обороты по счетам по месяцам (из /api/banking/balance/summary)
  const [turnoverHistory, setTurnoverHistory] = useState<BalanceHistoryMonth[]>([]);
  const [turnoverLoading, setTurnoverLoading] = useState(true);

  const sumByn = accounts
    .filter((a) => a.currency === "BYN" && !a.hidden)
    .reduce((sum, a) => sum + a.balance, 0);
  const sumUsd = accounts
    .filter((a) => a.currency === "USD" && !a.hidden)
    .reduce((sum, a) => sum + a.balance, 0);
  const sumRub = accounts
    .filter((a) => a.currency === "RUB" && !a.hidden)
    .reduce((sum, a) => sum + a.balance, 0);
  const sumEur = accounts
    .filter((a) => a.currency === "EUR" && !a.hidden)
    .reduce((sum, a) => sum + a.balance, 0);

  const fmt = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2 });

  // Подгружаем реальные обороты по счетам из БД (агрегат из statement_lines).
  useEffect(() => {
    let cancelled = false;
    setTurnoverLoading(true);
    fetchBalanceSummary(6)
      .then((data) => {
        if (!cancelled) setTurnoverHistory(data.history ?? []);
      })
      .catch(() => {
        if (!cancelled) setTurnoverHistory([]);
      })
      .finally(() => {
        if (!cancelled) setTurnoverLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="sbbol-dashboard sbbol-page-wrap w-full">
      {bannerVisible && (
        <section className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-[#eef0f4] via-[#e8ecf2] to-[#dfe6ee] min-h-[180px] lg:min-h-[200px]">
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <div className="absolute right-[10%] top-[-20%] w-48 h-48 rounded-full bg-[#90d0cc]/40 blur-2xl" />
            <div className="absolute right-[25%] bottom-[-30%] w-56 h-56 rounded-full bg-[#668abc]/30 blur-2xl" />
          </div>
          <button
            type="button"
            onClick={() => setBannerVisible(false)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[#7d838a] hover:text-[#1f1f22] z-10"
            aria-label="Закрыть баннер"
          >
            ✕
          </button>
          <div className="relative z-[1] p-6 lg:p-8 max-w-xl">
            <h2 className="text-xl lg:text-2xl font-semibold text-[#1f1f22] leading-snug">{banner.title}</h2>
            <p className="mt-2 text-sm text-[#565b62]">{banner.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="sbbol-btn-primary h-10 px-5 text-sm" onClick={() => showStubToast("Подробнее — демо-режим")}>
                Подробнее
              </button>
              <button type="button" className="sbbol-btn-secondary h-10 px-5 text-sm" onClick={() => showStubToast("Запрос создан (демо)")}>
                Создать запрос
              </button>
            </div>
            <div className="mt-4 flex gap-1.5">
              {PROMO_BANNERS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Баннер ${i + 1}`}
                  onClick={() => setBannerIndex(i)}
                  className={`w-2 h-2 rounded-full ${i === bannerIndex ? "bg-[#f5a623]" : "bg-[#d0d7dd]"}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <h1 className="sbbol-page-title">{orgName}</h1>
        <button
          type="button"
          data-assistant-action="create-document"
          className="sbbol-create-doc-btn shrink-0 self-start"
          onClick={openDocumentModal}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Создать документ
        </button>
      </div>

      <section className="mb-6">
        <details className="group" open>
          <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-semibold text-[#1f1f22] mb-4">
            <span className="text-[#7d838a] group-open:rotate-90 transition-transform inline-block">›</span>
            Всего доступно средств
            <span className="w-4 h-4 rounded-full border border-[#d0d7dd] text-[10px] flex items-center justify-center text-[#7d838a] font-normal ml-1">
              i
            </span>
          </summary>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#7d838a] mb-1">На счетах в BYN</p>
              <p className="text-3xl font-semibold text-[#1f1f22]">
                {fmt(sumByn)}
                <span className="text-lg ml-1 font-normal text-[#565b62]">BYN</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#7d838a] mb-1">На счетах в других валютах</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#565b62]">
                <span>
                  <span className="text-[#1f1f22] font-semibold">{fmt(sumUsd)}</span> USD
                </span>
                <span>
                  <span className="text-[#1f1f22] font-semibold">{fmt(sumRub)}</span> RUB
                </span>
                <span>
                  <span className="text-[#1f1f22] font-semibold">{fmt(sumEur)}</span> EUR
                </span>
              </div>
            </div>
          </div>
        </details>
      </section>

      <div className="grid xl:grid-cols-[1fr_auto] gap-6 items-start">
        <section className="sbbol-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-[#e4e8eb]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#1f1f22]">Счета</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <button type="button" className="text-[#565b62] hover:text-[#107f8c]">
                  Все валюты • Все счета ▾
                </button>
                <label className="flex items-center gap-2 text-[#565b62] cursor-pointer">
                  <input type="checkbox" className="sbbol-checkbox" />
                  Отображать скрытые
                </label>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[#107f8c] font-medium hover:underline"
                  onClick={() => void loadAll()}
                >
                  <IconRefresh />
                  Обновить остатки
                </button>
                <button type="button" className="p-1 text-[#7d838a] hover:text-[#1f1f22]" aria-label="Настройки счетов">
                  <IconSettings />
                </button>
              </div>
            </div>
          </div>

          <ul className="divide-y divide-[#e4e8eb]">
            {accounts.map((acc) => (
              <li key={acc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#f8f9fb] transition-colors">
                <div
                  className="w-10 h-10 rounded-full bg-[#f2f4f7] border border-[#e4e8eb] flex items-center justify-center text-xs font-semibold text-[#565b62] shrink-0"
                  suppressHydrationWarning
                >
                  <span suppressHydrationWarning>{acc.currency}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1f1f22] tracking-wide">{acc.id}</p>
                  <p className="text-xs text-[#7d838a] mt-0.5">{acc.type}</p>
                  <p className="text-xs text-[#107f8c] mt-0.5">{acc.label}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-semibold text-[#1f1f22]">{fmt(acc.balance)}</p>
                  <p className="text-xs text-[#7d838a]">{acc.currency}</p>
                </div>
                <button type="button" className="p-2 text-[#7d838a] hover:text-[#1f1f22]" aria-label="Действия">
                  <IconMoreVertical />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="sbbol-card w-full xl:w-[280px] shrink-0 xl:mt-[54px]">
          <ul>
            {DASHBOARD_QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center gap-3 px-5 py-4 text-sm text-[#1f1f22] hover:bg-[#f8f9fb] border-b border-[#e4e8eb] last:border-b-0 transition-colors"
                >
                  <QuickLinkIcon label={link.label} />
                  <span>{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section className="mt-8 sbbol-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#1f1f22]">Динамика оборотов по счетам, BYN</h3>
          <span className="text-[11px] text-[#7d838a] flex items-center gap-1.5">
            {/* В БД credit = поступления, debit = расходы. */}
            <span className="w-2.5 h-2.5 bg-[#107f8c] rounded" /> Поступления (кредит)
            <span className="w-2.5 h-2.5 bg-amber-400 rounded ml-2" /> Расходы (дебет)
          </span>
        </div>
        <TurnoverBars history={turnoverHistory} loading={turnoverLoading} />
        <p className="mt-3 text-[10px] text-[#7d838a]">
          * Данные из PostgreSQL: агрегат statement_lines по орг-ии за последние 6 месяцев. credit = поступления, debit = расходы.
        </p>
      </section>
    </div>
  );
}

const RU_MONTH_SHORT = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

function TurnoverBars({
  history,
  loading,
}: {
  history: BalanceHistoryMonth[];
  loading: boolean;
}) {
  // Дозаполняем пустые месяцы нулями, чтобы было ровно 6 столбцов подряд
  // (даже если в /api/banking/balance/summary вернулось меньше — нет проводок).
  const today = new Date();
  const months: BalanceHistoryMonth[] = [];
  const idxByKey = new Map(history.map((h) => [h.month, h]));
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(
      idxByKey.get(key) ?? {
        month: key,
        label: `${RU_MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,
        amount: 0,
        debit: 0,
        credit: 0,
      },
    );
  }
  // Y-шкала авто-скейлится по реальным данным из БД (а не 10k хардкодом).
  // Округляем вверх до «человеческой» границы: 1/2/2.5/5/10 × 10^n.
  const dataMax = Math.max(1, ...months.flatMap((m) => [m.credit, m.debit]));
  const maxTick = niceMax(dataMax);
  const ticks = [maxTick, maxTick * 0.75, maxTick * 0.5, maxTick * 0.25, 0];

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-[#7d838a]">
        Загрузка данных…
      </div>
    );
  }

  if (months.every((m) => m.debit === 0 && m.credit === 0)) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-[#7d838a]">
        Нет данных по оборотам за выбранный период
      </div>
    );
  }

  const fmtTick = (v: number) => {
    if (v === 0) return "0";
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
    return v.toFixed(0);
  };

  return (
    <div>
      <div className="h-48 flex items-end gap-2 px-1 relative">
        {/* Горизонтальные сетки */}
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute left-0 right-0 border-t border-dashed border-[#e4e8eb] text-[9px] text-[#94a3b8] px-1"
            style={{ bottom: `${(t / maxTick) * 100}%` }}
          >
            <span className="absolute -top-2 right-1 bg-white px-0.5">
              {fmtTick(t)}
            </span>
          </div>
        ))}
        {months.map((m) => {
          // В БД credit = поступления, debit = расходы.
          const inH = (m.credit / maxTick) * 100;
          const outH = (m.debit / maxTick) * 100;
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-0.5 z-10">
              <div
                title={`Поступления: ${m.credit.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} BYN`}
                className="w-3 bg-[#107f8c] rounded-t-sm hover:opacity-80 transition-opacity"
                style={{ height: `${Math.max(inH, m.credit > 0 ? 2 : 0)}%` }}
              />
              <div
                title={`Расходы: ${m.debit.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} BYN`}
                className="w-3 bg-amber-400 rounded-t-sm hover:opacity-80 transition-opacity"
                style={{ height: `${Math.max(outH, m.debit > 0 ? 2 : 0)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-3 text-[10px] text-[#7d838a] px-1">
        {months.map((m) => (
          <span key={m.month} className="flex-1 text-center">
            {RU_MONTH_SHORT[Number(m.month.split("-")[1]) - 1]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Округляет max значения вверх до «человеческой» границы: 1/2/2.5/5/10 × 10^n.
 *  Примеры: 1234 → 2500; 96500 → 100000; 1_200_000 → 2_000_000. */
function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(v)));
  const normalized = v / magnitude;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 2.5) nice = 2.5;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}
