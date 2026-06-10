"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  MoreVertical,
  Pencil,
  Search,
  Star,
  X,
} from "lucide-react";
import { fetchDocuments, createDocument, signDocument } from "@/lib/api/banking";
import type { BankDocument } from "@/lib/banking/types";
import { bankingToast } from "@/lib/banking/toast";

type TabKey =
  | "all"
  | "to_sign"
  | "signed"
  | "processing"
  | "executed"
  | "rejected"
  | "draft"
  | "deleted";

const TABS: { key: TabKey; label: string; status?: string }[] = [
  { key: "all", label: "Все документы" },
  { key: "to_sign", label: "На подпись", status: "На подписи" },
  { key: "signed", label: "Подписанные", status: "Подписан" },
  { key: "processing", label: "В обработке", status: "В обработке" },
  { key: "executed", label: "Исполненные", status: "Проведен" },
  { key: "rejected", label: "Отказанные", status: "Отказан" },
  { key: "draft", label: "Черновики", status: "Черновик" },
  { key: "deleted", label: "Удаленные", status: "Удален" },
];

function formatAmount(amount: number, currency: string): string {
  const formatted = amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted}${currency === "BYN" ? "BYN" : ` ${currency}`}`;
}

function parseDocDate(date: string): number {
  const [d, m, y] = date.split(".").map(Number);
  return new Date(y, m - 1, d).getTime();
}

type PeriodKey = "all" | "today" | "week" | "month" | "quarter" | "year";

const PERIODS: { key: PeriodKey; label: string; days?: number }[] = [
  { key: "all", label: "За все время" },
  { key: "today", label: "Сегодня", days: 1 },
  { key: "week", label: "За неделю", days: 7 },
  { key: "month", label: "За месяц", days: 31 },
  { key: "quarter", label: "За квартал", days: 92 },
  { key: "year", label: "За год", days: 366 },
];

function inPeriod(docDate: string, period: PeriodKey): boolean {
  const def = PERIODS.find((p) => p.key === period);
  if (!def?.days) return true;
  const diffMs = Date.now() - parseDocDate(docDate);
  return diffMs <= def.days * 24 * 60 * 60 * 1000 && diffMs > -24 * 60 * 60 * 1000;
}

const FAV_STORAGE_KEY = "sbbol_fav_docs";

function loadFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(FAV_STORAGE_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function statusLabel(status: string): string {
  if (status === "На подписи") return "На подписи";
  if (status === "Черновик") return "Черновик";
  if (status === "Проведен") return "Исполнен";
  return status;
}

interface Props {
  title: string;
  /** Точный doc_type (PAY_DOC_CORPO_CARD) */
  docType?: string;
  /** Префикс doc_type (INFO:) */
  docPrefix?: string;
  backHref?: string;
  createLabel?: string;
  rowTitle?: string;
  rowSubtitle?: string;
  variant?: "transfer" | "info";
  showImport?: boolean;
  filter2Label?: string;
  defaultTab?: TabKey;
  hideAmount?: boolean;
  docRefLabel?: string;
}

const INFO_PREFIX = "INFO:";

function displayKind(type: string): string {
  return type.startsWith(INFO_PREFIX) ? type.slice(INFO_PREFIX.length) : type;
}

export default function ProductDocumentsView({
  title,
  docType,
  docPrefix,
  backHref = "/products",
  createLabel = "Создать документ",
  rowTitle = "Перевод на корпоративные карты",
  rowSubtitle = "Пополнение карточного счета",
  variant = "transfer",
  showImport = true,
  filter2Label = "Все валюты • Все счета",
  defaultTab = "to_sign",
  hideAmount = false,
  docRefLabel = "Платежное поручение",
}: Props) {
  const router = useRouter();
  const [documents, setDocuments] = useState<BankDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [signing, setSigning] = useState(false);
  const periodMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!periodMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (!periodMenuRef.current?.contains(e.target as Node)) setPeriodMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [periodMenuOpen]);

  const toggleFavorite = (docId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      try {
        window.localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* quota */
      }
      return next;
    });
  };

  const resetFilters = () => {
    setSearchQuery("");
    setPeriod("all");
    setFavoritesOnly(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchDocuments({ docType, docPrefix });
      setDocuments(rows);
    } catch {
      bankingToast("Не удалось загрузить документы", "err");
    } finally {
      setLoading(false);
    }
  }, [docType, docPrefix]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: documents.length,
      to_sign: 0,
      signed: 0,
      processing: 0,
      executed: 0,
      rejected: 0,
      draft: 0,
      deleted: 0,
    };
    for (const d of documents) {
      if (d.status === "На подписи") c.to_sign++;
      else if (d.status === "Подписан") c.signed++;
      else if (d.status === "В обработке") c.processing++;
      else if (d.status === "Проведен") c.executed++;
      else if (d.status === "Отказан") c.rejected++;
      else if (d.status === "Черновик") c.draft++;
      else if (d.status === "Удален") c.deleted++;
    }
    return c;
  }, [documents]);

  const filtered = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    let rows = documents;
    if (tab?.status) {
      rows = rows.filter((d) => d.status === tab.status);
    }
    if (period !== "all") {
      rows = rows.filter((d) => inPeriod(d.date, period));
    }
    if (favoritesOnly) {
      rows = rows.filter((d) => favorites.has(d.id));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((d) =>
        [d.doc_number ?? "", d.id, d.type, d.counterparty ?? "", d.purpose ?? "", d.status, String(d.amount)]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    const dir = sortDesc ? -1 : 1;
    return [...rows].sort((a, b) => dir * (parseDocDate(a.date) - parseDocDate(b.date)));
  }, [documents, activeTab, period, favoritesOnly, favorites, searchQuery, sortDesc]);

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  };

  const handleCreate = async () => {
    try {
      const newType =
        variant === "info"
          ? `${INFO_PREFIX}Остаток по счету (предварительная информация)`
          : (docType ?? "");
      await createDocument({
        type: newType,
        counterparty:
          variant === "info" ? "" : "BY83 BPSB 3012 8888 8888 0933 0000",
        amount: 0,
        currency: "BYN",
        purpose:
          variant === "info"
            ? "По состоянию на текущий момент"
            : rowSubtitle,
        status: "Черновик",
      });
      bankingToast("Черновик документа создан");
      await load();
      setActiveTab("draft");
    } catch {
      bankingToast("Ошибка создания документа", "err");
    }
  };

  const handleBulkSign = async () => {
    if (selected.size === 0) return;
    setSigning(true);
    let ok = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        await signDocument(id);
        ok++;
      } catch {
        failed++;
      }
    }
    setSigning(false);
    setSelected(new Set());
    bankingToast(
      failed === 0
        ? `Подписано документов: ${ok}`
        : `Подписано: ${ok}, с ошибкой: ${failed}`,
      failed === 0 ? "ok" : "err",
    );
    await load();
  };

  const showBulkBar = activeTab === "to_sign" && filtered.length > 0;

  return (
    <div className="font-sans -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Teal header */}
      <div className="bg-[#2d9494] text-white px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={backHref} className="shrink-0 p-1 hover:bg-white/10 rounded" aria-label="Назад">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-base sm:text-lg font-semibold truncate">{title}</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            {showImport && (
              <button
                type="button"
                onClick={() => bankingToast("Импорт из файла — в полной версии SBBOL")}
                className="px-4 py-2 text-sm font-medium border border-white/80 rounded hover:bg-white/10"
              >
                Импортировать
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCreate()}
              className="px-4 py-2 text-sm font-semibold bg-white text-[#2d9494] rounded hover:bg-gray-50"
            >
              {createLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#f4f6f8] border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3 text-sm text-gray-700">
          {/* Search with magnifier */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск: номер, контрагент, назначение…"
              className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2d9494]/30 focus:border-[#2d9494] transition-shadow"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                aria-label="Очистить поиск"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Period dropdown */}
          <div className="relative" ref={periodMenuRef}>
            <button
              type="button"
              onClick={() => setPeriodMenuOpen((v) => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 bg-white border rounded-full transition-colors ${
                period !== "all" ? "border-[#2d9494] text-[#2d9494] font-medium" : "border-gray-200"
              }`}
            >
              {PERIODS.find((p) => p.key === period)?.label}
              <ChevronDown className={`w-4 h-4 transition-transform ${periodMenuOpen ? "rotate-180" : ""} ${period !== "all" ? "text-[#2d9494]" : "text-gray-400"}`} />
            </button>
            {periodMenuOpen && (
              <div className="absolute z-20 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setPeriod(p.key);
                      setPeriodMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      period === p.key ? "text-[#2d9494] font-semibold bg-teal-50/50" : "text-gray-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="hidden sm:block px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-500 cursor-default">
            {filter2Label}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className={`hover:underline ${
              searchQuery || period !== "all" || favoritesOnly ? "text-[#2d9494] font-medium" : "text-gray-500"
            }`}
          >
            Сбросить фильтры
          </button>
          <label className="ml-auto flex items-center gap-2 cursor-pointer">
            <span className="text-gray-600">Избранное</span>
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => setFavoritesOnly(e.target.checked)}
              className="rounded accent-[#2d9494]"
            />
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="max-w-6xl mx-auto flex px-4 sm:px-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setSelected(new Set());
              }}
              className={`shrink-0 px-4 py-3 text-sm border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#2d9494] text-[#2d9494] font-semibold"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
              <span className="ml-1 text-gray-400">{counts[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sort + bulk */}
      <div className="bg-white px-4 sm:px-6 py-2 border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-sm">
          {showBulkBar ? (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-[#2d9494] font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="rounded accent-[#2d9494]"
                />
                Выбрать все
              </label>
              {selected.size > 0 && (
                <button
                  type="button"
                  disabled={signing}
                  onClick={() => void handleBulkSign()}
                  className="px-3.5 py-1.5 rounded-full bg-[#2d9494] text-white text-xs font-semibold hover:bg-[#267a7a] disabled:opacity-60"
                >
                  {signing ? "Подписание…" : `Подписать (${selected.size})`}
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-xs">
              {activeTab === "draft"
                ? "Для групповой обработки документов перейдите на вкладку нужного статуса"
                : "\u00a0"}
            </p>
          )}
          <button
            type="button"
            onClick={() => setSortDesc((v) => !v)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            По дате документа ({sortDesc ? "по убыванию" : "по возрастанию"})
            <ChevronDown className={`w-4 h-4 transition-transform ${sortDesc ? "" : "rotate-180"}`} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white min-h-[320px]">
        {loading ? (
          <p className="text-center text-gray-400 py-12 text-sm">Загрузка…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">Документы не найдены</p>
        ) : (
          <ul className="max-w-6xl mx-auto divide-y divide-gray-100">
            {filtered.map((doc) => {
              const isSelected = selected.has(doc.id);
              const account = doc.counterparty?.trim();
              const kindTitle =
                variant === "info" ? displayKind(doc.type) : rowTitle;
              const accountLine =
                variant === "info"
                  ? `Номер счета: ${account || ""}`
                  : `На счет: ${account || "\u00a0"}`;
              const subLine = variant === "info" ? doc.purpose : rowSubtitle;
              const num = doc.doc_number ?? doc.id;
              const refLine =
                docRefLabel.trim() === ""
                  ? `${num} от ${doc.date}`
                  : `${docRefLabel} ${num} от ${doc.date}`;
              const showAmt = !hideAmount && !(variant === "info" && doc.amount === 0);
              return (
                <li
                  key={doc.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/other/documents/view?doc=${encodeURIComponent(doc.id)}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      router.push(`/other/documents/view?doc=${encodeURIComponent(doc.id)}`);
                    }
                  }}
                  className={`flex items-start gap-4 px-4 sm:px-6 py-4 hover:bg-gray-50/80 cursor-pointer ${
                    isSelected ? "bg-teal-50/40" : ""
                  }`}
                >
                  {showBulkBar && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => {
                        const next = new Set(selected);
                        if (next.has(doc.id)) next.delete(doc.id);
                        else next.add(doc.id);
                        setSelected(next);
                      }}
                      className="mt-1 rounded accent-[#2d9494]"
                    />
                  )}
                  <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 md:gap-6 items-center">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {kindTitle}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">{accountLine}</p>
                      <p className="text-xs text-gray-500">{subLine}</p>
                      <p className="text-sm text-gray-700 mt-1">{refLine}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      {doc.status === "На подписи" && (
                        <Pencil className="w-3.5 h-3.5 text-orange-500" />
                      )}
                      <span
                        className={
                          doc.status === "На подписи"
                            ? "text-orange-600 font-medium"
                            : doc.status === "Черновик"
                              ? "text-gray-500"
                              : "text-gray-600"
                        }
                      >
                        {statusLabel(doc.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-3">
                      {showAmt ? (
                        <span className="text-base font-bold text-gray-900 whitespace-nowrap">
                          {formatAmount(doc.amount, doc.currency)}
                        </span>
                      ) : (
                        <span className="w-8" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(doc.id);
                        }}
                        className={`p-1 transition-colors ${
                          favorites.has(doc.id)
                            ? "text-amber-400 hover:text-amber-500"
                            : "text-gray-300 hover:text-amber-400"
                        }`}
                        aria-label="В избранное"
                      >
                        <Star className="w-4 h-4" fill={favorites.has(doc.id) ? "currentColor" : "none"} />
                      </button>
                      <button type="button" className="p-1 text-gray-400 hover:text-gray-600" aria-label="Меню">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
