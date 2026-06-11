"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  Banknote,
  ExternalLink,
  Copy,
  Download,
  PenLine,
  Hash,
  Tag,
  CheckCircle2,
  Clock,
  FileSignature,
  CircleDashed,
  AlertCircle,
  Sparkles,
  Receipt,
  ScrollText,
} from "lucide-react";
import { fetchDocument, signDocument } from "@/lib/api/banking";
import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";
import { parseAnyDocumentIdFromSearch } from "@/lib/banking/documentDeepLink";
import type { BankDocument, DocumentStatus } from "@/lib/banking/types";
import { bankingToast } from "@/lib/banking/toast";
import { useBankingStore } from "@/store/bankingStore";

const INFO_PREFIX = "INFO:";

function displayNumber(doc: BankDocument): string {
  return doc.doc_number ?? doc.id;
}

function isReport(doc: BankDocument): boolean {
  return doc.type.startsWith(INFO_PREFIX) || doc.amount === 0;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusKind = "success" | "warning" | "muted" | "info" | "danger";

function statusMeta(status: DocumentStatus): {
  label: string;
  kind: StatusKind;
  Icon: React.ComponentType<{ className?: string }>;
} {
  switch (status) {
    case "Проведен":
    case "Подписан":
      return { label: status, kind: "success", Icon: CheckCircle2 };
    case "На подписи":
      return { label: status, kind: "warning", Icon: FileSignature };
    case "Черновик":
      return { label: status, kind: "muted", Icon: CircleDashed };
    case "В обработке":
      return { label: status, kind: "info", Icon: Clock };
    case "Отказан":
    case "Удален":
      return { label: status, kind: "danger", Icon: AlertCircle };
    default:
      return { label: status, kind: "info", Icon: Clock };
  }
}

const STATUS_STYLES: Record<StatusKind, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/30",
  muted: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20",
  info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
};

function StatusBadge({ status }: { status: DocumentStatus }) {
  const meta = statusMeta(status);
  const Icon = meta.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[meta.kind]}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

// ─── Number formatting ────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatAmountParts(amount: number, currency: string) {
  const formatted = amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [intPart, fracPart] = formatted.split(",");
  return { intPart, fracPart, currency };
}

// ─── Counterparty parser (light) ──────────────────────────────────────────────

/** Вытащить правовую форму ("ООО", "ОАО", "ИП", "ЗАО") из строки контрагента. */
function splitCounterparty(raw: string): { form: string | null; name: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { form: null, name: "" };
  const m = trimmed.match(/^(\s*(?:ООО|ОАО|ЗАО|ОДО|ПТ|ЧУП|ГП|СПК|УП|ИП|ФЛ)\s+)/i);
  if (m) {
    return { form: m[1].trim().toUpperCase(), name: trimmed.slice(m[0].length).trim() };
  }
  // «Иванов И.И.» — оставляем как есть
  return { form: null, name: trimmed };
}

// ─── Skeleton (loading state) ─────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden>
      {/* Hero skeleton */}
      <div className="rounded-2xl bg-gradient-to-br from-sbbol-primary/40 to-sbbol-primary-dark/40 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-white/30" />
            <div className="h-5 w-40 rounded bg-white/40" />
          </div>
          <div className="h-6 w-24 rounded-full bg-white/30" />
        </div>
        <div className="mt-6 space-y-2">
          <div className="h-3 w-16 rounded bg-white/30" />
          <div className="h-10 w-64 rounded bg-white/50" />
        </div>
      </div>
      {/* Fields skeleton */}
      <div className="rounded-2xl bg-white p-1 shadow-sm">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0">
            <div className="h-4 w-4 rounded bg-gray-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-20 rounded bg-gray-200" />
              <div className="h-4 w-48 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DocumentDetailView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = parseAnyDocumentIdFromSearch(searchParams) ?? searchParams.get("id") ?? "";
  const [doc, setDoc] = useState<BankDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleSign = async () => {
    if (!doc || signing) return;
    setSigning(true);
    try {
      const updated = await signDocument(doc.id);
      setDoc(updated);
      bankingToast(`Документ ${displayNumber(updated)} подписан`);
      void useBankingStore.getState().loadAll();
    } catch {
      bankingToast("Не удалось подписать документ", "err");
    } finally {
      setSigning(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!doc || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(apiUrl(`/api/banking/documents/${encodeURIComponent(doc.id)}/pdf`), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("pdf");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${displayNumber(doc).replace(/[^\wа-яёА-ЯЁ -]/gi, "").trim() || "document"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      bankingToast("Не удалось сформировать PDF", "err");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyRequisites = useCallback(() => {
    if (!doc) return;
    const lines = [
      `${displayNumber(doc)} от ${doc.date}`,
      `Тип: ${doc.type}`,
      doc.counterparty ? `Контрагент: ${doc.counterparty}` : null,
      doc.amount > 0 ? `Сумма: ${formatAmount(doc.amount, doc.currency)}` : null,
      doc.purpose ? `Назначение: ${doc.purpose}` : null,
    ].filter(Boolean);
    void navigator.clipboard.writeText(lines.join("\n"));
    bankingToast("Скопировано в буфер");
  }, [doc]);

  const load = useCallback(async () => {
    if (!docId) {
      setError("Не указан документ");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const row = await fetchDocument(docId);
      setDoc(row);
    } catch {
      setError("Документ не найден или нет доступа");
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    void load();
  }, [load]);

  const report = doc ? isReport(doc) : false;
  const typeLabel = doc
    ? doc.type.startsWith(INFO_PREFIX)
      ? doc.type.slice(INFO_PREFIX.length)
      : doc.type
    : "";

  const cpParts = useMemo(
    () => (doc && !report ? splitCounterparty(doc.counterparty) : { form: null, name: "" }),
    [doc, report],
  );

  return (
    <div className="min-h-full bg-gradient-to-b from-sbbol-bg via-sbbol-bg to-white">
      {/* ─── Breadcrumb + back ─────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sbbol-secondary hover:text-sbbol-primary transition-colors"
            aria-label="Назад"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад</span>
          </button>
          <span className="text-sbbol-muted">/</span>
          <Link
            href="/other/documents"
            className="text-sbbol-secondary hover:text-sbbol-primary transition-colors truncate"
          >
            Документы
          </Link>
          {doc && (
            <>
              <span className="text-sbbol-muted">/</span>
              <span className="text-sbbol-text font-medium truncate">
                № {displayNumber(doc)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-32 sm:pb-8">
        {/* ─── Loading ─────────────────────────────────────────────────── */}
        {loading && <DetailSkeleton />}

        {/* ─── Error / empty ──────────────────────────────────────────── */}
        {error && !loading && (
          <div className="mt-6 bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <p className="text-sbbol-text font-medium mb-1">Не удалось открыть документ</p>
            <p className="text-sbbol-secondary text-sm mb-5">{error}</p>
            <Link
              href="/other/documents"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sbbol-primary text-white text-sm font-medium hover:bg-sbbol-primary-dark transition-colors"
            >
              Ко всем документам
            </Link>
          </div>
        )}

        {doc && !loading && (
          <div className="space-y-4">
            {/* ─── HERO: тип + статус + сумма ──────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d6e68] via-sbbol-primary to-[#107c79] text-white shadow-lg shadow-sbbol-primary/20">
              {/* Декоративный паттерн */}
              <div
                className="absolute inset-0 opacity-[0.08] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 0%, white 0, transparent 40%), radial-gradient(circle at 100% 100%, white 0, transparent 30%)",
                }}
                aria-hidden
              />
              <div className="relative p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wider mb-1.5">
                      {report ? (
                        <ScrollText className="w-3.5 h-3.5" />
                      ) : (
                        <Receipt className="w-3.5 h-3.5" />
                      )}
                      <span>{report ? "Отчёт / справка" : "Платёжный документ"}</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-semibold leading-tight">
                      {typeLabel}
                    </h1>
                    {doc.doc_number && (
                      <p className="text-white/80 text-sm mt-0.5 font-mono">
                        № {displayNumber(doc)}
                      </p>
                    )}
                  </div>
                  {/* Status badge — контрастный фон на тёмном hero */}
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-white/15 text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      {doc.status}
                    </span>
                  </div>
                </div>

                {/* Сумма — главный визуальный якорь */}
                {doc.amount > 0 ? (
                  <div>
                    <p className="text-white/70 text-xs uppercase tracking-wider mb-1">
                      Сумма
                    </p>
                    <AmountDisplay amount={doc.amount} currency={doc.currency} />
                  </div>
                ) : (
                  <div className="text-white/80 text-sm">
                    <Sparkles className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    Без суммы
                  </div>
                )}

                {/* Быстрые метаданные */}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/85">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-white/60" />
                    {doc.date}
                  </span>
                  {!report && cpParts.name && (
                    <span className="inline-flex items-center gap-1.5 truncate max-w-[60vw]">
                      <Building2 className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      <span className="truncate">
                        {cpParts.form && (
                          <span className="text-white/60">{cpParts.form} </span>
                        )}
                        {cpParts.name}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Реквизиты документа (2 колонки) ────────────────────── */}
            <section className="bg-white rounded-2xl border border-sbbol-border/60 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-sbbol-bg/50 to-white">
                <h2 className="text-sm font-semibold text-sbbol-text inline-flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sbbol-primary" />
                  Реквизиты документа
                </h2>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="divide-y divide-gray-100">
                  <Field
                    icon={<Calendar className="w-4 h-4" />}
                    label="Дата"
                    value={doc.date}
                  />
                  <Field
                    icon={<Hash className="w-4 h-4" />}
                    label="Номер"
                    value={displayNumber(doc)}
                    mono
                  />
                  <Field
                    icon={<Tag className="w-4 h-4" />}
                    label="Вид документа"
                    value={typeLabel}
                  />
                </div>
                <div className="divide-y divide-gray-100">
                  <Field
                    icon={<Building2 className="w-4 h-4" />}
                    label={report ? "Счёт / источник" : "Контрагент"}
                    value={
                      report
                        ? doc.counterparty?.trim() || "—"
                        : doc.counterparty || "—"
                    }
                    highlight={!report}
                    splitForm={!report ? cpParts : null}
                  />
                  {doc.amount > 0 && (
                    <Field
                      icon={<Banknote className="w-4 h-4" />}
                      label="Сумма"
                      value={formatAmount(doc.amount, doc.currency)}
                      highlight
                    />
                  )}
                  <Field
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    label="Статус"
                    value={<StatusBadge status={doc.status} />}
                  />
                </div>
              </dl>
            </section>

            {/* ─── Назначение / период (полная ширина) ─────────────────── */}
            <section className="bg-white rounded-2xl border border-sbbol-border/60 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-sbbol-bg/50 to-white flex items-center justify-between">
                <h2 className="text-sm font-semibold text-sbbol-text inline-flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-sbbol-primary" />
                  {report ? "Описание / период" : "Назначение платежа"}
                </h2>
                {doc.purpose && doc.purpose !== "—" && (
                  <button
                    type="button"
                    onClick={handleCopyRequisites}
                    className="text-xs text-sbbol-secondary hover:text-sbbol-primary transition-colors inline-flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Скопировать всё
                  </button>
                )}
              </div>
              <div className="px-5 py-4">
                {doc.purpose ? (
                  <p className="text-[15px] text-sbbol-text leading-relaxed whitespace-pre-wrap break-words">
                    {doc.purpose}
                  </p>
                ) : (
                  <p className="text-sbbol-muted text-sm italic">Не указано</p>
                )}
              </div>
            </section>

            {/* ─── Action bar — sticky снизу на mobile ──────────────── */}
            <ActionBar
              doc={doc}
              report={report}
              signing={signing}
              downloading={downloading}
              onSign={handleSign}
              onDownload={handleDownloadPdf}
              onCopy={handleCopyRequisites}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Amount display (крупно, с дробной частью) ───────────────────────────────

function AmountDisplay({ amount, currency }: { amount: number; currency: string }) {
  const { intPart, fracPart } = formatAmountParts(amount, currency);
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="text-3xl sm:text-4xl font-bold font-display tracking-tight tabular-nums">
        {intPart}
        <span className="text-2xl sm:text-3xl text-white/70">,{fracPart}</span>
      </span>
      <span className="text-base sm:text-lg font-semibold text-white/80 px-2 py-0.5 rounded-md bg-white/10">
        {currency}
      </span>
    </div>
  );
}

// ─── Action bar (sticky на mobile) ────────────────────────────────────────────

function ActionBar({
  doc,
  report,
  signing,
  downloading,
  onSign,
  onDownload,
  onCopy,
}: {
  doc: BankDocument;
  report: boolean;
  signing: boolean;
  downloading: boolean;
  onSign: () => void;
  onDownload: () => void;
  onCopy: () => void;
}) {
  return (
    <>
      {/* Spacer под sticky-bar (только mobile) */}
      <div className="h-20 sm:hidden" aria-hidden />

      <div
        className="
          fixed bottom-0 inset-x-0 z-30 sm:static sm:z-auto
          bg-white/95 backdrop-blur-md sm:bg-transparent sm:backdrop-blur-0
          border-t border-gray-200 sm:border-t-0
          shadow-[0_-8px_24px_rgba(0,0,0,0.08)] sm:shadow-none
          px-4 py-3 sm:p-0
        "
      >
        <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-2">
          {/* Primary action: подписать (если на подписи) или открыть форму */}
          {doc.status === "На подписи" ? (
            <button
              type="button"
              onClick={onSign}
              disabled={signing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60 transition-all shadow-sm hover:shadow"
            >
              <PenLine className="w-4 h-4" />
              {signing ? "Подписываю…" : "Подписать"}
            </button>
          ) : report ? (
            <Link
              href="/statement/account?period=month"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sbbol-primary text-white text-sm font-semibold hover:bg-sbbol-primary-dark transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Открыть выписку за период
            </Link>
          ) : (
            <Link
              href={`/payments/paydocbyn?source_doc=${encodeURIComponent(doc.id)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sbbol-primary text-white text-sm font-semibold hover:bg-sbbol-primary-dark transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Открыть в форме платежа
            </Link>
          )}

          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-sbbol-primary/40 bg-white text-sm font-medium text-sbbol-primary hover:bg-sbbol-primary/5 disabled:opacity-60 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{downloading ? "Формирую PDF…" : "Скачать PDF"}</span>
            <span className="sm:hidden">PDF</span>
          </button>

          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-sbbol-secondary hover:bg-gray-50 hover:text-sbbol-text transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Копировать</span>
          </button>

          <Link
            href="/other/documents"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-sbbol-secondary hover:bg-gray-50 hover:text-sbbol-text transition-colors sm:ml-auto"
          >
            Все документы
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function Field({
  icon,
  label,
  value,
  highlight,
  mono,
  splitForm,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  mono?: boolean;
  splitForm?: { form: string | null; name: string } | null;
}) {
  // Рендерим value: если splitForm задан и есть form — показываем form + name раздельно
  let renderedValue: React.ReactNode = value;
  if (splitForm && typeof value === "string") {
    renderedValue = (
      <span className="truncate inline-flex items-baseline gap-1.5 max-w-full">
        {splitForm.form && (
          <span className="shrink-0 text-xs font-bold tracking-wider text-sbbol-primary bg-sbbol-primary/10 px-1.5 py-0.5 rounded">
            {splitForm.form}
          </span>
        )}
        <span className="truncate">{value}</span>
      </span>
    );
  }

  return (
    <div className="px-5 py-3.5 flex gap-3 items-start">
      <div className="text-sbbol-muted mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-medium text-sbbol-muted uppercase tracking-wider">
          {label}
        </dt>
        <dd
          className={[
            "text-sm mt-0.5 break-words",
            mono ? "font-mono tabular-nums" : "",
            highlight ? "text-sbbol-text font-semibold" : "text-sbbol-text/90",
          ].join(" ")}
        >
          {renderedValue}
        </dd>
      </div>
    </div>
  );
}
