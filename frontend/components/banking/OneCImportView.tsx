"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";

interface OneCDoc {
  id: string;
  external_id: string;
  doc_kind_label: string;
  counterparty: string;
  amount: number;
  currency: string;
  purpose: string;
  status: string;
}

interface OneCStatus {
  is_active: boolean;
  last_sync_at: string | null;
  pending_count: number;
}

export function OneCImportView() {
  const [status, setStatus] = useState<OneCStatus | null>(null);
  const [docs, setDocs] = useState<OneCDoc[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<OneCDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const h = authHeaders();
    const [st, list] = await Promise.all([
      fetch(apiUrl("/api/onec/status"), { credentials: "same-origin", headers: h }).then((r) => r.json()),
      fetch(apiUrl("/api/onec/documents?status=pending"), { credentials: "same-origin", headers: h }).then((r) => r.json()),
    ]);
    setStatus(st);
    setDocs(list);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await fetch(apiUrl("/api/onec/sync"), { method: "POST", credentials: "same-origin", headers: authHeaders() });
      setMessage("Синхронизация с 1С завершена (демо).");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const importBatch = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/onec/import-batch"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ document_ids: [...selected] }),
      });
      const data = await res.json();
      setMessage(`Импортировано документов: ${Array.isArray(data) ? data.length : selected.size}. Статус: «На подписи».`);
      setSelected(new Set());
      setPreview(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-[#1f1f22]">Коннектор 1С</h1>
        <p className="text-sm text-[#565b62] mt-1">
          Импорт платёжных документов из 1С в СберБизнес (демо-режим).
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#e4e8eb] p-4 bg-white">
          <p className="text-xs text-[#7d838a]">Подключение</p>
          <p className="text-sm font-medium mt-1">{status?.is_active ? "🟢 Активно" : "⚪ Не подключено"}</p>
        </div>
        <div className="rounded-xl border border-[#e4e8eb] p-4 bg-white">
          <p className="text-xs text-[#7d838a]">Последняя синхронизация</p>
          <p className="text-sm font-medium mt-1">{status?.last_sync_at ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-[#e4e8eb] p-4 bg-white">
          <p className="text-xs text-[#7d838a]">К оплате</p>
          <p className="text-sm font-medium mt-1">{status?.pending_count ?? docs.length} док.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void sync()} className="sbbol-btn-primary h-10 px-4 text-sm">
          Синхронизировать
        </button>
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={() => void importBatch()}
          className="sbbol-btn-secondary h-10 px-4 text-sm"
        >
          Импортировать выбранные ({selected.size})
        </button>
      </div>

      {message && <p className="text-sm text-[#107f8c] bg-[#e5fcf7] rounded-lg px-3 py-2">{message}</p>}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#e4e8eb] overflow-hidden bg-white">
          <div className="px-4 py-2 border-b border-[#e4e8eb] text-sm font-medium">Документы к оплате</div>
          <ul className="divide-y divide-[#e4e8eb] max-h-80 overflow-y-auto">
            {docs.map((d) => (
              <li key={d.id} className="px-4 py-3 hover:bg-[#f8fafb]">
                <label className="flex gap-3 cursor-pointer items-start">
                  <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} className="mt-1" />
                  <button type="button" className="text-left flex-1" onClick={() => setPreview(d)}>
                    <p className="text-sm font-medium">{d.doc_kind_label}</p>
                    <p className="text-xs text-[#565b62]">{d.counterparty} · {d.amount.toLocaleString()} {d.currency}</p>
                  </button>
                </label>
              </li>
            ))}
            {docs.length === 0 && <li className="px-4 py-6 text-sm text-[#7d838a]">Нет документов — нажмите «Синхронизировать».</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-[#e4e8eb] p-4 bg-white min-h-[200px]">
          <p className="text-sm font-medium mb-3">Предпросмотр перед импортом</p>
          {preview ? (
            <dl className="text-sm space-y-2">
              <div><dt className="text-[#7d838a] text-xs">Тип</dt><dd>{preview.doc_kind_label}</dd></div>
              <div><dt className="text-[#7d838a] text-xs">Контрагент</dt><dd>{preview.counterparty}</dd></div>
              <div><dt className="text-[#7d838a] text-xs">Сумма</dt><dd>{preview.amount.toLocaleString()} {preview.currency}</dd></div>
              <div><dt className="text-[#7d838a] text-xs">Назначение</dt><dd className="text-[#565b62]">{preview.purpose || "—"}</dd></div>
              <div><dt className="text-[#7d838a] text-xs">Внешний ID</dt><dd className="font-mono text-xs">{preview.external_id}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-[#7d838a]">Выберите документ из списка для предпросмотра полей.</p>
          )}
        </div>
      </div>
    </div>
  );
}
