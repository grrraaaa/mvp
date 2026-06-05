"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Link2,
  FileInput,
  CheckCircle2,
  Database,
  Loader2,
  Package,
} from "lucide-react";
import {
  connectOneC,
  fetchOneCDocuments,
  fetchOneCStatus,
  importOneCBatch,
  importOneCDocument,
  syncOneC,
  type OneCDocument,
  type OneCConnectionStatus,
} from "@/lib/api/onec";
import { useBankingStore } from "@/store/bankingStore";

const KIND_COLORS: Record<string, string> = {
  payment_request: "bg-sky-50 text-sky-700 border-sky-100",
  tax: "bg-amber-50 text-amber-700 border-amber-100",
  ttn: "bg-violet-50 text-violet-700 border-violet-100",
  payroll: "bg-emerald-50 text-emerald-700 border-emerald-100",
  contract: "bg-teal-50 text-teal-700 border-teal-100",
};

export function OneCConnector() {
  const loadAll = useBankingStore((s) => s.loadAll);
  const [status, setStatus] = useState<OneCConnectionStatus | null>(null);
  const [docs, setDocs] = useState<OneCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [serverUrl, setServerUrl] = useState("http://1c-emulator.local/sber");
  const [token, setToken] = useState("demo-1c-token");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [st, pending] = await Promise.all([
        fetchOneCStatus(),
        fetchOneCDocuments("pending"),
      ]);
      setStatus(st);
      setDocs(pending);
      setServerUrl(st.server_url);
    } catch {
      setMessage("Ошибка загрузки. Проверьте авторизацию и PostgreSQL.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleConnect = async () => {
    setBusy(true);
    setMessage("");
    try {
      const st = await connectOneC(serverUrl, token);
      setStatus(st);
      setMessage("Подключение к 1С установлено. Данные хранятся в PostgreSQL.");
      await refresh();
    } catch {
      setMessage("Не удалось подключить 1С.");
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    setBusy(true);
    setMessage("");
    try {
      const synced = await syncOneC();
      setDocs(synced);
      setMessage(`Синхронизация: получено ${synced.length} документ(ов) из 1С.`);
      const st = await fetchOneCStatus();
      setStatus(st);
    } catch {
      setMessage("Ошибка синхронизации.");
    } finally {
      setBusy(false);
    }
  };

  const handleImportOne = async (id: string) => {
    setBusy(true);
    try {
      await importOneCDocument(id);
      setMessage("Платёжка сформирована и добавлена «На подписи».");
      await refresh();
      await loadAll();
    } catch {
      setMessage("Ошибка импорта документа.");
    } finally {
      setBusy(false);
    }
  };

  const handleImportAll = async () => {
    if (!docs.length) return;
    setBusy(true);
    try {
      const created = await importOneCBatch(docs.map((d) => d.id));
      setMessage(`Импортировано ${created.length} платёж(ек) из 1С.`);
      await refresh();
      await loadAll();
    } catch {
      setMessage("Ошибка пакетного импорта.");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Загрузка коннектора 1С…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#083526]/5 to-[#138d8a]/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#138d8a]/15 rounded-xl text-[#138d8a]">
              <Database className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-gray-800">Коннектор 1С</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Эмуляция интеграции — все документы в <strong>PostgreSQL</strong>
              </p>
            </div>
          </div>
          {status?.is_active && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Подключено
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">URL сервера 1С</label>
            <input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#138d8a]/30 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Токен доступа</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#138d8a]/30 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-assistant-action="onec-connect"
            disabled={busy}
            onClick={() => void handleConnect()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#138d8a] rounded-lg hover:bg-[#107c79] disabled:opacity-50"
          >
            <Link2 className="w-4 h-4" />
            Подключить
          </button>
          <button
            type="button"
            data-assistant-action="onec-sync"
            disabled={busy}
            onClick={() => void handleSync()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#138d8a] bg-[#e7f4f4] border border-[#138d8a]/20 rounded-lg hover:bg-[#d5eceb] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            Синхронизировать
          </button>
          {docs.length > 0 && (
            <button
              type="button"
              data-assistant-action="onec-import-all"
              disabled={busy}
              onClick={() => void handleImportAll()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#083526] rounded-lg hover:bg-[#062a1e] disabled:opacity-50"
            >
              <Package className="w-4 h-4" />
              Импортировать все ({docs.length})
            </button>
          )}
        </div>

        {status && (
          <p className="text-xs text-gray-500">
            Ожидают импорта: <strong>{status.pending_count}</strong>
            {status.last_sync_at && (
              <> · Последняя синхронизация: {new Date(status.last_sync_at).toLocaleString("ru-RU")}</>
            )}
          </p>
        )}

        {message && (
          <p className="text-xs text-[#138d8a] bg-[#e7f4f4] border border-[#138d8a]/15 rounded-lg px-3 py-2">{message}</p>
        )}

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Документы из 1С к оплате</h4>
          {docs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-xl">
              Нет документов. Нажмите «Синхронизировать».
            </p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-start justify-between gap-3 p-3 border border-gray-100 rounded-xl hover:border-[#138d8a]/30 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${KIND_COLORS[doc.doc_kind] ?? "bg-gray-50 text-gray-600"}`}
                      >
                        {doc.doc_kind_label}
                      </span>
                      <span className="text-[10px] text-gray-400">{doc.external_id}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{doc.counterparty}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{doc.purpose}</p>
                    <p className="text-xs font-bold text-[#138d8a] mt-1 tabular-nums">
                      {doc.amount.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} {doc.currency}
                      {doc.due_date && <span className="text-gray-400 font-normal"> · до {doc.due_date}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleImportOne(doc.id)}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-[#138d8a] border border-[#138d8a]/30 rounded-lg hover:bg-[#e7f4f4] disabled:opacity-50"
                  >
                    <FileInput className="w-3.5 h-3.5" />
                    В банк
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
