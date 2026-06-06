"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";

interface GatewayPayment {
  id: string;
  amount: number;
  currency: string;
  counterparty: string;
  status: string;
  status_message: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Ожидание",
  processing: "Обработка",
  executed: "Исполнен",
  rejected: "Отклонён",
};

export function GatewayStatusBanner() {
  const [payments, setPayments] = useState<GatewayPayment[]>([]);

  const load = useCallback(async () => {
    if (!authHeaders().Authorization) return;
    const res = await fetch(apiUrl("/api/banking/gateway/payments"), {
      credentials: "same-origin",
      headers: authHeaders(),
    });
    if (!res.ok) return;
    setPayments(await res.json());
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  const advance = async (id: string) => {
    await fetch(apiUrl(`/api/banking/gateway/payments/${id}/advance`), {
      method: "POST",
      credentials: "same-origin",
      headers: authHeaders(),
    });
    await load();
  };

  const active = payments.filter((p) => p.status === "pending" || p.status === "processing").slice(0, 2);
  if (!active.length) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 max-w-xs space-y-2 pointer-events-auto">
      {active.map((p) => (
        <div key={p.id} className="rounded-lg border border-[#e4e8eb] bg-white shadow-lg p-3 text-xs">
          <p className="font-medium text-[#1f1f22]">Шлюз SBBOL · {STATUS_LABEL[p.status] ?? p.status}</p>
          <p className="text-[#565b62] mt-1">{p.counterparty} — {p.amount} {p.currency}</p>
          <p className="text-[#7d838a] mt-0.5">{p.status_message}</p>
          {(p.status === "pending" || p.status === "processing") && (
            <button
              type="button"
              className="mt-2 text-[#107f8c] hover:underline"
              onClick={() => void advance(p.id)}
            >
              Обновить статус
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
