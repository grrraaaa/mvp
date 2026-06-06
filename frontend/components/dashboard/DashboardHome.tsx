"use client";

import Link from "next/link";
import { useState } from "react";
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

export function DashboardHome() {
  const { openDocumentModal } = useSbbolUi();
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(true);
  const banner = PROMO_BANNERS[bannerIndex];

  const accounts = useBankingStore((s) => s.accounts);
  const loadAll = useBankingStore((s) => s.loadAll);
  const orgName = useAuthStore((s) => s.user?.org_name) ?? "DEMO ЮРИДИЧЕСКОЕ ЛИЦО";

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
        <h3 className="text-base font-semibold text-[#1f1f22] mb-4">Динамика оборотов по счетам, BYN</h3>
        <div className="h-48 flex items-end gap-2 px-2">
          {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 48, 90].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-[#90d0cc] rounded-t-sm hover:bg-[#107f8c] transition-colors"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-3 text-[10px] text-[#7d838a] px-1">
          {["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
