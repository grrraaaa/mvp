"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { fetchDocument } from "@/lib/api/banking";
import { parseDocumentIdFromSearch } from "@/lib/banking/documentDeepLink";
import type { BankDocument } from "@/lib/banking/types";
import { bankingToast } from "@/lib/banking/toast";

const INFO_PREFIX = "INFO:";

function displayNumber(doc: BankDocument): string {
  return doc.doc_number ?? doc.id;
}

function isReport(doc: BankDocument): boolean {
  return doc.type.startsWith(INFO_PREFIX) || doc.amount === 0;
}

function statusClass(status: string): string {
  if (status === "Проведен") return "bg-emerald-100 text-emerald-800";
  if (status === "На подписи") return "bg-amber-100 text-amber-800";
  if (status === "Черновик") return "bg-gray-100 text-gray-600";
  return "bg-sky-100 text-sky-800";
}

export function DocumentDetailView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = parseDocumentIdFromSearch(searchParams) ?? searchParams.get("id") ?? "";
  const [doc, setDoc] = useState<BankDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-full bg-[#f4f6f8] font-sans">
      <div className="bg-[#2d9494] text-white px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 rounded hover:bg-white/10"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">
              {report ? "Отчёт / информация по счёту" : "Документ"}
            </h1>
            {doc && (
              <p className="text-sm text-white/85 truncate">{displayNumber(doc)}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {loading && (
          <p className="text-center text-gray-500 py-16">Загрузка документа…</p>
        )}

        {error && !loading && (
          <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
            <p className="text-red-700 mb-4">{error}</p>
            <Link
              href="/other/documents"
              className="text-[#2d9494] font-medium hover:underline"
            >
              Все документы
            </Link>
          </div>
        )}

        {doc && !loading && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#2d9494]" />
                  <span className="font-semibold text-gray-900">{displayNumber(doc)}</span>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusClass(doc.status)}`}>
                  {doc.status}
                </span>
              </div>

              <dl className="divide-y divide-gray-100">
                <DetailRow icon={<Calendar className="w-4 h-4" />} label="Дата" value={doc.date} />
                <DetailRow icon={<FileText className="w-4 h-4" />} label="Вид документа" value={typeLabel} highlight />
                {!report && (
                  <DetailRow
                    icon={<Building2 className="w-4 h-4" />}
                    label="Контрагент"
                    value={doc.counterparty}
                    highlight
                  />
                )}
                {report && doc.counterparty?.trim() && (
                  <DetailRow
                    icon={<Building2 className="w-4 h-4" />}
                    label="Счёт"
                    value={doc.counterparty}
                  />
                )}
                {doc.amount > 0 && (
                  <DetailRow
                    icon={<Banknote className="w-4 h-4" />}
                    label="Сумма"
                    value={`${doc.amount.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ${doc.currency}`}
                    highlight
                  />
                )}
                <DetailRow
                  icon={<Copy className="w-4 h-4" />}
                  label="Назначение / период"
                  value={doc.purpose || "—"}
                  highlight
                />
              </dl>
            </div>

            <div className="flex flex-wrap gap-2">
              {report ? (
                <Link
                  href="/statement/account?period=month"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2d9494] text-white text-sm font-medium hover:bg-[#267a7a]"
                >
                  <ExternalLink className="w-4 h-4" />
                  Открыть выписку за период
                </Link>
              ) : (
                <Link
                  href={`/payments/paydocbyn?source_doc=${encodeURIComponent(doc.id)}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2d9494] text-white text-sm font-medium hover:bg-[#267a7a]"
                >
                  Открыть в форме платежа
                </Link>
              )}
              <Link
                href="/other/documents"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Все документы
              </Link>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${displayNumber(doc)} от ${doc.date}\n${doc.purpose}`,
                  );
                  bankingToast("Скопировано в буфер");
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" />
                Копировать реквизиты
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-5 py-3.5 flex gap-3">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd
          className={`text-sm mt-0.5 break-words ${
            highlight ? "font-medium text-gray-900 assistant-source-highlight rounded px-1 -mx-1" : "text-gray-800"
          }`}
          style={
            highlight
              ? { boxShadow: "inset 0 0 0 2px #21A038", backgroundColor: "rgba(33,160,56,0.06)" }
              : undefined
          }
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
