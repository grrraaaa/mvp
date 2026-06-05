import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";
import type { BankDocument } from "@/lib/banking/types";

export interface OneCConnectionStatus {
  org_id: string;
  server_url: string;
  is_active: boolean;
  last_sync_at: string | null;
  pending_count: number;
}

export interface OneCDocument {
  id: string;
  external_id: string;
  doc_kind: string;
  doc_kind_label: string;
  counterparty: string;
  unp: string;
  iban: string;
  bik: string;
  amount: number;
  currency: string;
  purpose: string;
  payment_code?: string;
  due_date?: string;
  status: string;
  bank_doc_number?: string;
}

async function fetchAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`1C API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchOneCStatus(): Promise<OneCConnectionStatus> {
  return fetchAuth<OneCConnectionStatus>("/api/onec/status");
}

export function connectOneC(serverUrl: string, accessToken: string): Promise<OneCConnectionStatus> {
  return fetchAuth<OneCConnectionStatus>("/api/onec/connect", {
    method: "POST",
    body: JSON.stringify({ server_url: serverUrl, access_token: accessToken }),
  });
}

export function syncOneC(): Promise<OneCDocument[]> {
  return fetchAuth<OneCDocument[]>("/api/onec/sync", { method: "POST" });
}

export function fetchOneCDocuments(status?: string): Promise<OneCDocument[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchAuth<OneCDocument[]>(`/api/onec/documents${q}`);
}

export function importOneCDocument(id: string): Promise<BankDocument> {
  return fetchAuth<BankDocument>(`/api/onec/documents/${encodeURIComponent(id)}/import`, {
    method: "POST",
  });
}

export function importOneCBatch(ids: string[]): Promise<BankDocument[]> {
  return fetchAuth<BankDocument[]>("/api/onec/import-batch", {
    method: "POST",
    body: JSON.stringify({ document_ids: ids }),
  });
}
