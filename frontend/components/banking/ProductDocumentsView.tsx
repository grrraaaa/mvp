"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Filter,
  MoreVertical,
  Pencil,
  Search,
  Star,
  X,
  Check,
  Hash,
  Building2,
  Tag,
  Wallet,
} from "lucide-react";
import {
  buildDocumentsQueryString,
  createDocument,
  fetchDocumentFacets,
  fetchDocuments,
  parseDocumentsSearchParams,
  signDocument,
  type DocumentFacets,
} from "@/lib/api/banking";
import type { BankDocument } from "@/lib/banking/types";
import { getDefaultLastMonth } from "@/lib/banking/demoTime";
import { bankingToast } from "@/lib/banking/toast";
import { ASSISTANT_ACTION_EVENT } from "@/lib/assistant/uiBridge";

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

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
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

function ymdToMs(date: string): number {
  const [d, m, y] = date.split(".").map(Number);
  return new Date(y, m - 1, d).getTime();
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

interface FilterState {
  year: number | null;
  month: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  status: string | null;
  docTypeFilter: string | null;
  counterparty: string | null;
  minAmount: string;
  maxAmount: string;
  q: string;
}

const EMPTY_FILTERS: FilterState = {
  year: null,
  month: null,
  dateFrom: null,
  dateTo: null,
  status: null,
  docTypeFilter: null,
  counterparty: null,
  minAmount: "",
  maxAmount: "",
  q: "",
};

function filtersToParams(f: FilterState, opts: { limit?: number } = {}): NonNullable<Parameters<typeof fetchDocuments>[0]> {
  const p: NonNullable<Parameters<typeof fetchDocuments>[0]> = {};
  if (f.year != null) p.year = f.year;
  if (f.month != null) p.month = f.month;
  if (f.dateFrom) p.dateFrom = f.dateFrom;
  if (f.dateTo) p.dateTo = f.dateTo;
  if (f.status) p.status = f.status;
  if (f.docTypeFilter) p.docType = f.docTypeFilter;
  if (f.counterparty) p.counterparty = f.counterparty;
  if (f.q) p.q = f.q;
  if (f.minAmount) p.minAmount = Number(f.minAmount.replace(",", "."));
  if (f.maxAmount) p.maxAmount = Number(f.maxAmount.replace(",", "."));
  if (opts.limit) p.limit = opts.limit;
  return p;
}

function filtersToQuery(f: FilterState): string {
  return buildDocumentsQueryString({
    year: f.year,
    month: f.month,
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    status: f.status,
    docType: f.docTypeFilter,
    counterparty: f.counterparty,
    q: f.q,
    minAmount: f.minAmount ? Number(f.minAmount.replace(",", ".")) : null,
    maxAmount: f.maxAmount ? Number(f.maxAmount.replace(",", ".")) : null,
  });
}

/** Конвертация dd.mm.yyyy → yyyy-mm-dd для <input type="date">. */
function _ddmmyyyyToIso(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(value);
  if (!m) return "";
  let [, d, mo, y] = m;
  if (y.length === 2) y = `20${y}`;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Конвертация yyyy-mm-dd (native date input) → dd.mm.yyyy для state/URL. */
function _isoToDdMmYyyy(value: string): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return `${m[3]}.${m[2]}.${m[1]}`;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAllDocsPage = pathname === "/other/documents";

  const [documents, setDocuments] = useState<BankDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [signing, setSigning] = useState(false);
  const [facets, setFacets] = useState<DocumentFacets | null>(null);

  // Расширенные фильтры
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [counterpartyMenuOpen, setCounterpartyMenuOpen] = useState(false);
  const yearMenuRef = useRef<HTMLDivElement | null>(null);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const typeMenuRef = useRef<HTMLDivElement | null>(null);
  const cpMenuRef = useRef<HTMLDivElement | null>(null);
  const filtersPanelRef = useRef<HTMLDivElement | null>(null);

  // Снимок URL → state (только для /other/documents).
  // Перечитываем при КАЖДОМ изменении searchParams — это позволяет ассистенту
  // повторно применять фильтры (например, присылая новый query-параметр year=2026),
  // а не только при первом монтировании.
  // Чтобы не было петель «state→URL→state», сравниваем текущее значение URL с
  // последним уже применённым.
  const lastAppliedUrlRef = useRef<string>("");

  // ── URL → state (только для /other/documents) ───────────────────────────
  useEffect(() => {
    if (!isAllDocsPage) return;
    const sp = parseDocumentsSearchParams(searchParams);
    const urlKey = searchParams.toString();
    if (urlKey === lastAppliedUrlRef.current) return;
    lastAppliedUrlRef.current = urlKey;

    const hasAnyUrlFilter =
      sp.year != null ||
      sp.month != null ||
      sp.dateFrom != null ||
      sp.dateTo != null ||
      sp.status != null ||
      sp.statuses.length > 0 ||
      sp.docType != null ||
      sp.counterparty != null ||
      (sp.q ?? "") !== "" ||
      sp.minAmount != null ||
      sp.maxAmount != null;

    let next: FilterState;
    if (!hasAnyUrlFilter) {
      // Первый заход без параметров → дефолт «последний месяц» (предыдущий
      // календарный), чтобы не вываливать все 165 документов сразу. Совпадает
      // с бэкенд-логикой `_parse_relative_period("за последний месяц")`.
      const def = getDefaultLastMonth();
      next = {
        ...EMPTY_FILTERS,
        year: def.year,
        month: def.month,
        minAmount: "",
        maxAmount: "",
      };
    } else {
      next = {
        ...EMPTY_FILTERS,
        year: sp.year,
        month: sp.month,
        dateFrom: sp.dateFrom,
        dateTo: sp.dateTo,
        status: sp.status,
        docTypeFilter: sp.docType,
        counterparty: sp.counterparty,
        q: sp.q ?? "",
        minAmount: sp.minAmount != null ? String(sp.minAmount) : "",
        maxAmount: sp.maxAmount != null ? String(sp.maxAmount) : "",
      };
    }
    // Если есть явный статус — переключаем вкладку на соответствующую
    if (sp.status) {
      const tabByStatus = TABS.find((t) => t.status === sp.status);
      if (tabByStatus) setActiveTab(tabByStatus.key);
    } else if (sp.statuses?.length) {
      setActiveTab("all");
    } else if (!sp.q) {
      setActiveTab("all");
    }
    setFilters(next);
  }, [isAllDocsPage, searchParams]);

  // ── Закрытие дропдаунов по клику вне ──────────────────────────────────────
  useEffect(() => {
    if (!yearMenuOpen && !monthMenuOpen && !typeMenuOpen && !counterpartyMenuOpen) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (yearMenuRef.current?.contains(t)) return;
      if (monthMenuRef.current?.contains(t)) return;
      if (typeMenuRef.current?.contains(t)) return;
      if (cpMenuRef.current?.contains(t)) return;
      setYearMenuOpen(false);
      setMonthMenuOpen(false);
      setTypeMenuOpen(false);
      setCounterpartyMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [yearMenuOpen, monthMenuOpen, typeMenuOpen, counterpartyMenuOpen]);

  // ── Ассистент: слушаем клики «filter-signed» / «reset-filters» / …
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ action: string; value?: string }>).detail;
      if (!detail) return;
      const value = detail.value;
      if (detail.action === "reset-filters") {
        setFilters(EMPTY_FILTERS);
        setActiveTab("all");
        if (isAllDocsPage) {
          const url = new URL(window.location.href);
          url.search = "";
          window.history.replaceState(null, "", url.toString());
        }
        bankingToast("Фильтры сброшены");
      } else if (detail.action === "filter-signed") {
        setActiveTab("to_sign");
        setFilters((f) => ({ ...f, status: "На подписи" }));
      } else if (detail.action === "filter-year" && value) {
        const yr = Number(value);
        if (!Number.isNaN(yr)) {
          setFilters((f) => ({ ...f, year: yr, month: null }));
          setActiveTab("all");
        }
      } else if (detail.action === "filter-month" && value) {
        // value формата "YYYY-MM"
        const m = value.match(/^(\d{4})-(\d{1,2})$/);
        if (m) {
          setFilters((f) => ({ ...f, year: Number(m[1]), month: Number(m[2]) }));
          setActiveTab("all");
        }
      } else if (detail.action === "filter-range" && value) {
        // value: "dd.mm.yyyy|dd.mm.yyyy"
        const parts = value.split("|");
        if (parts.length === 2) {
          setFilters((f) => ({ ...f, dateFrom: parts[0], dateTo: parts[1] }));
          setActiveTab("all");
        }
      } else if (detail.action === "filter-counterparty" && value) {
        setFilters((f) => ({ ...f, counterparty: value }));
        setActiveTab("all");
      } else if (detail.action === "filter-doc-type" && value) {
        setFilters((f) => ({ ...f, docTypeFilter: value }));
        setActiveTab("all");
      } else if (detail.action === "filter-amount" && value) {
        // value: "min|max" — пустая строка = граница не задана
        const [lo, hi] = value.split("|");
        setFilters((f) => ({
          ...f,
          minAmount: lo ?? "",
          maxAmount: hi ?? "",
        }));
        setActiveTab("all");
      } else if (detail.action === "filter-search" && value) {
        setFilters((f) => ({ ...f, q: value }));
        setActiveTab("all");
      }
    };
    window.addEventListener(ASSISTANT_ACTION_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_ACTION_EVENT, handler);
  }, [isAllDocsPage]);

  // ── Загрузка facets один раз (на /other/documents) ───────────────────────
  useEffect(() => {
    if (!isAllDocsPage) return;
    let cancelled = false;
    void fetchDocumentFacets()
      .then((data) => {
        if (!cancelled) setFacets(data);
      })
      .catch(() => setFacets(null));
    return () => {
      cancelled = true;
    };
  }, [isAllDocsPage]);

  // ── Загрузка документов ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtersToParams(filters, { limit: 1000 });
      // Если выбрана вкладка со статусом — добавим в params
      const tab = TABS.find((t) => t.key === activeTab);
      if (tab?.status && !params.status) (params as { status?: string }).status = tab.status;
      const rows = await fetchDocuments({
        docType,
        docPrefix,
        ...params,
      });
      setDocuments(rows);
    } catch {
      bankingToast("Не удалось загрузить документы", "err");
    } finally {
      setLoading(false);
    }
  }, [docType, docPrefix, filters, activeTab]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── URL sync (только /other/documents) ─────────────────────────────────
  useEffect(() => {
    if (!isAllDocsPage) return;
    const qs = filtersToQuery(filters);
    const url = qs ? `${pathname}?${qs}` : pathname;
    const current = `${pathname}${searchParams.toString() ? "?" + searchParams.toString() : ""}`;
    if (url !== current) {
      window.history.replaceState(null, "", url);
    }
  }, [filters, isAllDocsPage, pathname, searchParams]);

  // ── Counts по табам (на сервере мы фильтруем по docType/docPrefix, но
  //    counts считаем по всем загруженным документам org_id) ───────────────
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

  // ── Клиентская фильтрация поверх серверной (поиск/диапазон сумм/избранное) ─
  const filtered = useMemo(() => {
    let rows = documents;
    if (favoritesOnly) {
      rows = rows.filter((d) => favorites.has(d.id));
    }
    const q = filters.q.trim().toLowerCase();
    if (q && !isAllDocsPage) {
      // На /other/documents поиск уже уехал на сервер
      rows = rows.filter((d) =>
        [d.doc_number ?? "", d.id, d.type, d.counterparty ?? "", d.purpose ?? "", d.status, String(d.amount)]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    // Диапазон сумм — клиент (на сервере тоже есть, но для быстрого UX дублируем)
    if (filters.minAmount) {
      const min = Number(filters.minAmount.replace(",", "."));
      if (!Number.isNaN(min)) rows = rows.filter((d) => d.amount >= min);
    }
    if (filters.maxAmount) {
      const max = Number(filters.maxAmount.replace(",", "."));
      if (!Number.isNaN(max)) rows = rows.filter((d) => d.amount <= max);
    }
    const dir = sortDesc ? -1 : 1;
    return [...rows].sort((a, b) => dir * (parseDocDate(a.date) - parseDocDate(b.date)));
  }, [documents, favoritesOnly, favorites, filters.q, filters.minAmount, filters.maxAmount, sortDesc, isAllDocsPage]);

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
    setFilters(EMPTY_FILTERS);
    setActiveTab("all");
  };

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // При смене вкладки — сбрасываем кастомный status в фильтрах, чтобы не было дублей
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSelected(new Set());
    const def = TABS.find((t) => t.key === tab);
    setFilters((f) => ({ ...f, status: def?.status ?? null }));
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.year != null) n++;
    if (filters.month != null) n++;
    if (filters.dateFrom) n++;
    if (filters.dateTo) n++;
    if (filters.counterparty) n++;
    if (filters.docTypeFilter) n++;
    if (filters.minAmount) n++;
    if (filters.maxAmount) n++;
    if (filters.q) n++;
    return n;
  }, [filters]);

  const showBulkBar = activeTab === "to_sign" && filtered.length > 0;
  const years = facets?.years ?? [];
  const docTypes = facets?.types ?? [];
  const counterparties = facets?.counterparties ?? [];

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
            {activeFilterCount > 0 && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                {activeFilterCount} фильтр
              </span>
            )}
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

      {/* Filters bar */}
      <div className="bg-[#f4f6f8] border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3 text-sm text-gray-700">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={filters.q}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter("q", e.target.value)}
              placeholder="Поиск: номер, контрагент, назначение…"
              className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2d9494]/30 focus:border-[#2d9494] transition-shadow"
            />
            {filters.q && (
              <button
                type="button"
                onClick={() => updateFilter("q", "")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                aria-label="Очистить поиск"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick period segmented control — web-mobile style */}
          {isAllDocsPage && (
            <div
              className="inline-flex items-center bg-white border border-gray-200 rounded-full p-0.5 text-xs font-semibold"
              role="tablist"
              aria-label="Быстрый период"
            >
              {[
                { id: "all", label: "Все" },
                { id: "year", label: "Год" },
                { id: "month", label: "Месяц" },
                { id: "range", label: "Период" },
              ].map((chip) => {
                const active =
                  chip.id === "all"
                    ? !filters.year && !filters.month && !filters.dateFrom && !filters.dateTo
                    : chip.id === "year"
                      ? filters.year != null && filters.month == null && !filters.dateFrom
                      : chip.id === "month"
                        ? filters.year != null && filters.month != null
                        : !!(filters.dateFrom || filters.dateTo);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-assistant-action={`quick-period-${chip.id}`}
                    onClick={() => {
                      if (chip.id === "all") {
                        setFilters((f) => ({ ...f, year: null, month: null, dateFrom: null, dateTo: null }));
                      } else if (chip.id === "year") {
                        setFilters((f) => ({
                          ...f,
                          year: f.year ?? Math.max(...(years.length ? years : [new Date().getFullYear()])),
                          month: null,
                          dateFrom: null,
                          dateTo: null,
                        }));
                      } else if (chip.id === "month") {
                        const y = filters.year ?? Math.max(...(years.length ? years : [new Date().getFullYear()]));
                        const m = filters.month ?? new Date().getMonth() + 1;
                        setFilters((f) => ({ ...f, year: y, month: m, dateFrom: null, dateTo: null }));
                      } else {
                        // range — открываем панель, фокус на первое поле
                        setFiltersOpen(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full transition-colors ${
                      active
                        ? "bg-[#2d9494] text-white shadow-sm"
                        : "text-gray-600 hover:text-[#2d9494]"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Year dropdown */}
          {isAllDocsPage && (
            <div className="relative" ref={yearMenuRef}>
              <button
                type="button"
                onClick={() => setYearMenuOpen((v) => !v)}
                className={`flex items-center gap-1 px-3 py-1.5 bg-white border rounded-full transition-colors ${
                  filters.year != null ? "border-[#2d9494] text-[#2d9494] font-medium" : "border-gray-200"
                }`}
              >
                {filters.year ?? "Год"}
                <ChevronDown className={`w-4 h-4 transition-transform ${yearMenuOpen ? "rotate-180" : ""} ${filters.year != null ? "text-[#2d9494]" : "text-gray-400"}`} />
              </button>
              {yearMenuOpen && (
                <div className="absolute z-20 mt-1.5 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      updateFilter("year", null);
                      setYearMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!filters.year ? "text-[#2d9494] font-semibold bg-teal-50/50" : "text-gray-700"}`}
                  >
                    Все годы
                  </button>
                  {years.length === 0 ? (
                    <p className="px-4 py-2 text-xs text-gray-400">Нет данных</p>
                  ) : (
                    years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          updateFilter("year", y);
                          updateFilter("month", null);
                          setYearMenuOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${filters.year === y ? "text-[#2d9494] font-semibold bg-teal-50/50" : "text-gray-700"}`}
                      >
                        {y}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Month dropdown (active when year selected) */}
          {isAllDocsPage && filters.year != null && (
            <div className="relative" ref={monthMenuRef}>
              <button
                type="button"
                onClick={() => setMonthMenuOpen((v) => !v)}
                className={`flex items-center gap-1 px-3 py-1.5 bg-white border rounded-full transition-colors ${
                  filters.month != null ? "border-[#2d9494] text-[#2d9494] font-medium" : "border-gray-200"
                }`}
              >
                {filters.month != null ? MONTHS_RU[filters.month - 1] : "Месяц"}
                <ChevronDown className={`w-4 h-4 transition-transform ${monthMenuOpen ? "rotate-180" : ""} ${filters.month != null ? "text-[#2d9494]" : "text-gray-400"}`} />
              </button>
              {monthMenuOpen && (
                <div className="absolute z-20 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      updateFilter("month", null);
                      setMonthMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${filters.month == null ? "text-[#2d9494] font-semibold bg-teal-50/50" : "text-gray-700"}`}
                  >
                    Весь год
                  </button>
                  {MONTHS_RU.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        updateFilter("month", idx + 1);
                        setMonthMenuOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${filters.month === idx + 1 ? "text-[#2d9494] font-semibold bg-teal-50/50" : "text-gray-700"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Date range — compact toggle (open full filter panel) */}
          {isAllDocsPage && (
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-full transition-colors ${
                filtersOpen || filters.dateFrom || filters.dateTo || activeFilterCount > 0
                  ? "border-[#2d9494] text-[#2d9494] font-medium"
                  : "border-gray-200"
              }`}
              aria-expanded={filtersOpen}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Все фильтры</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#2d9494] text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </button>
          )}

          {!isAllDocsPage && (
            <button type="button" className="hidden sm:block px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-500 cursor-default">
              {filter2Label}
            </button>
          )}

          <button
            type="button"
            data-assistant-action="reset-filters"
            onClick={resetFilters}
            className={`hover:underline ${
              activeFilterCount > 0 || activeTab !== "all" ? "text-[#2d9494] font-medium" : "text-gray-500"
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

        {/* Active-filter chips — web mobile summary. Видны всегда, когда есть фильтры. */}
        {isAllDocsPage && activeFilterCount > 0 && (
          <div
            data-testid="active-filters"
            className="max-w-6xl mx-auto mt-2 flex flex-wrap items-center gap-1.5"
          >
            <span className="text-[11px] text-gray-500 uppercase font-semibold tracking-wider mr-1">
              Активны:
            </span>
            {filters.year != null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2d9494]/10 text-[#2d9494] text-xs font-medium">
                {filters.year}
                {filters.month != null && ` · ${MONTHS_RU[filters.month - 1]}`}
                <button
                  type="button"
                  onClick={() => updateFilter("year", null)}
                  className="hover:text-red-500"
                  aria-label="Убрать год"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.dateFrom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2d9494]/10 text-[#2d9494] text-xs font-medium">
                с {filters.dateFrom}
                <button
                  type="button"
                  onClick={() => updateFilter("dateFrom", null)}
                  className="hover:text-red-500"
                  aria-label="Убрать дату начала"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.dateTo && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2d9494]/10 text-[#2d9494] text-xs font-medium">
                по {filters.dateTo}
                <button
                  type="button"
                  onClick={() => updateFilter("dateTo", null)}
                  className="hover:text-red-500"
                  aria-label="Убрать дату окончания"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2d9494]/10 text-[#2d9494] text-xs font-medium">
                {filters.status}
                <button
                  type="button"
                  onClick={() => updateFilter("status", null)}
                  className="hover:text-red-500"
                  aria-label="Убрать статус"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.docTypeFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2d9494]/10 text-[#2d9494] text-xs font-medium">
                {displayKind(filters.docTypeFilter)}
                <button
                  type="button"
                  onClick={() => updateFilter("docTypeFilter", null)}
                  className="hover:text-red-500"
                  aria-label="Убрать тип"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.counterparty && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2d9494]/10 text-[#2d9494] text-xs font-medium">
                {filters.counterparty}
                <button
                  type="button"
                  onClick={() => updateFilter("counterparty", null)}
                  className="hover:text-red-500"
                  aria-label="Убрать контрагента"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.minAmount || filters.maxAmount) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2d9494]/10 text-[#2d9494] text-xs font-medium">
                {filters.minAmount || "0"} — {filters.maxAmount || "∞"} BYN
                <button
                  type="button"
                  onClick={() => {
                    updateFilter("minAmount", "");
                    updateFilter("maxAmount", "");
                  }}
                  className="hover:text-red-500"
                  aria-label="Убрать диапазон суммы"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.q && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2d9494]/10 text-[#2d9494] text-xs font-medium">
                «{filters.q}»
                <button
                  type="button"
                  onClick={() => updateFilter("q", "")}
                  className="hover:text-red-500"
                  aria-label="Убрать поиск"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-gray-500 hover:text-[#2d9494] hover:underline ml-1"
            >
              Сбросить все
            </button>
          </div>
        )}

        {/* Extended filter panel */}
        {isAllDocsPage && filtersOpen && (
          <div
            ref={filtersPanelRef}
            className="max-w-6xl mx-auto mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white border border-gray-200 rounded-xl"
          >
            {/* Date range */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                <Calendar className="w-3 h-3" />
                Период (с — по)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={_ddmmyyyyToIso(filters.dateFrom)}
                  onChange={(e) => updateFilter("dateFrom", _isoToDdMmYyyy(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9494]/30 focus:border-[#2d9494]"
                  aria-label="Дата начала"
                />
                <span className="text-gray-400 text-xs">—</span>
                <input
                  type="date"
                  value={_ddmmyyyyToIso(filters.dateTo)}
                  onChange={(e) => updateFilter("dateTo", _isoToDdMmYyyy(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9494]/30 focus:border-[#2d9494]"
                  aria-label="Дата окончания"
                />
              </div>
            </div>

            {/* Document type */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                <Tag className="w-3 h-3" />
                Тип документа
              </label>
              <div className="relative" ref={typeMenuRef}>
                <button
                  type="button"
                  onClick={() => setTypeMenuOpen((v) => !v)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-sm bg-white border rounded-lg ${
                    filters.docTypeFilter ? "border-[#2d9494] text-[#2d9494] font-medium" : "border-gray-200"
                  }`}
                >
                  <span className="truncate">
                    {filters.docTypeFilter
                      ? displayKind(filters.docTypeFilter)
                      : "Все типы"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${typeMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {typeMenuOpen && (
                  <div className="absolute z-30 mt-1.5 left-0 right-0 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("docTypeFilter", null);
                        setTypeMenuOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${!filters.docTypeFilter ? "text-[#2d9494] font-semibold bg-teal-50/50" : "text-gray-700"}`}
                    >
                      Все типы
                    </button>
                    {docTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          updateFilter("docTypeFilter", t);
                          setTypeMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${filters.docTypeFilter === t ? "text-[#2d9494] font-semibold bg-teal-50/50" : "text-gray-700"}`}
                      >
                        {displayKind(t)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Counterparty */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                <Building2 className="w-3 h-3" />
                Контрагент
              </label>
              <div className="relative" ref={cpMenuRef}>
                <button
                  type="button"
                  onClick={() => setCounterpartyMenuOpen((v) => !v)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-sm bg-white border rounded-lg ${
                    filters.counterparty ? "border-[#2d9494] text-[#2d9494] font-medium" : "border-gray-200"
                  }`}
                >
                  <span className="truncate">{filters.counterparty ?? "Любой"}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${counterpartyMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {counterpartyMenuOpen && (
                  <div className="absolute z-30 mt-1.5 left-0 right-0 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                    <button
                      type="button"
                      onClick={() => {
                        updateFilter("counterparty", null);
                        setCounterpartyMenuOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${!filters.counterparty ? "text-[#2d9494] font-semibold bg-teal-50/50" : "text-gray-700"}`}
                    >
                      Любой контрагент
                    </button>
                    {counterparties.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          updateFilter("counterparty", c);
                          setCounterpartyMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${filters.counterparty === c ? "text-[#2d9494] font-semibold bg-teal-50/50" : "text-gray-700"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Amount range */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                <Wallet className="w-3 h-3" />
                Сумма (от — до)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={filters.minAmount}
                  onChange={(e) => updateFilter("minAmount", e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9494]/30 focus:border-[#2d9494]"
                />
                <span className="text-gray-400 text-xs">—</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={filters.maxAmount}
                  onChange={(e) => updateFilter("maxAmount", e.target.value)}
                  placeholder="∞"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9494]/30 focus:border-[#2d9494]"
                />
              </div>
            </div>

            {/* Active chips summary */}
            {(filters.dateFrom || filters.dateTo) && (
              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">Применено:</span>
                {filters.dateFrom && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-[#2d9494] text-xs font-medium">
                    с {filters.dateFrom}
                    <button onClick={() => updateFilter("dateFrom", null)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.dateTo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-[#2d9494] text-xs font-medium">
                    по {filters.dateTo}
                    <button onClick={() => updateFilter("dateTo", null)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.docTypeFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-[#2d9494] text-xs font-medium">
                    {displayKind(filters.docTypeFilter)}
                    <button onClick={() => updateFilter("docTypeFilter", null)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.counterparty && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-[#2d9494] text-xs font-medium">
                    {filters.counterparty}
                    <button onClick={() => updateFilter("counterparty", null)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {(filters.minAmount || filters.maxAmount) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-[#2d9494] text-xs font-medium">
                    {filters.minAmount || "0"} — {filters.maxAmount || "∞"}
                    <button
                      onClick={() => {
                        updateFilter("minAmount", "");
                        updateFilter("maxAmount", "");
                      }}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="max-w-6xl mx-auto flex px-4 sm:px-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`shrink-0 px-4 py-3 text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "border-[#2d9494] text-[#2d9494] font-semibold"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
              <span className="text-gray-400 text-xs">{counts[tab.key]}</span>
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
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs">
              {filtered.length === documents.length
                ? `Всего: ${documents.length}`
                : `Найдено: ${filtered.length} из ${documents.length}`}
            </span>
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
      </div>

      {/* List */}
      <div className="bg-white min-h-[320px]">
        {loading ? (
          <p className="text-center text-gray-400 py-12 text-sm">Загрузка…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm space-y-2">
            <p>Документы не найдены</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[#2d9494] font-semibold hover:underline"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
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
