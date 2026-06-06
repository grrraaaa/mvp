"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";

interface CounterpartyRow {
  id: string;
  name: string;
  unp: string;
  account: string;
  bank_name: string;
  risk_score: number;
  risk_level: string;
  risk_notes: string;
}

export function CounterpartyRiskView() {
  const searchParams = useSearchParams();
  const cpId = searchParams.get("cp");
  const [rows, setRows] = useState<CounterpartyRow[]>([]);
  const [selected, setSelected] = useState<CounterpartyRow | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/banking/counterparties"), {
      credentials: "same-origin",
      headers: authHeaders(),
    });
    if (!res.ok) return;
    const data = (await res.json()) as CounterpartyRow[];
    setRows(data);
    if (cpId) {
      setSelected(data.find((r) => r.id === cpId) ?? null);
    }
  }, [cpId]);

  useEffect(() => {
    void load();
  }, [load]);

  const levelColor = (level: string) =>
    ({ low: "text-green-700 bg-green-50 border-green-200", medium: "text-amber-800 bg-amber-50 border-amber-200", high: "text-red-700 bg-red-50 border-red-200" })[level] ??
    "text-gray-700 bg-gray-50";

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Проверка контрагента</h1>
        <p className="text-sm text-[#565b62] mt-1">Due diligence и риск-скор по демо-реестру.</p>
      </header>

      {selected ? (
        <div className={`rounded-xl border p-5 ${levelColor(selected.risk_level)}`}>
          <p className="text-lg font-semibold">{selected.name}</p>
          <p className="text-sm mt-2">УНП: {selected.unp || "—"} · Счёт: {selected.account || "—"}</p>
          <p className="text-2xl font-bold mt-3">{selected.risk_score.toFixed(0)} / 100</p>
          <p className="text-sm capitalize mt-1">Уровень риска: {selected.risk_level}</p>
          {selected.risk_notes && <p className="text-sm mt-3">{selected.risk_notes}</p>}
        </div>
      ) : (
        <p className="text-sm text-[#7d838a]">Выберите контрагента или спросите в чате: «Проверь контрагента ООО Ромашка».</p>
      )}

      <ul className="divide-y divide-[#e4e8eb] rounded-xl border border-[#e4e8eb] bg-white overflow-hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-[#f8fafb] flex justify-between items-center gap-2"
              onClick={() => setSelected(r)}
            >
              <span className="text-sm font-medium truncate">{r.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${levelColor(r.risk_level)}`}>
                {r.risk_score.toFixed(0)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
