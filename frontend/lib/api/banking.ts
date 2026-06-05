import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";
import type {
  BankAccount,
  BankDocument,
  Counterparty,
  EmployeeSalary,
} from "@/lib/banking/types";

export interface CurrencyBalance {
  currency: string;
  total: number;
}

export interface BankingSummary {
  balances: CurrencyBalance[];
  total_accounts: number;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers: { ...authHeaders() },
  });
  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    throw new Error(`Banking API ${path}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchAccounts(): Promise<BankAccount[]> {
  return fetchJson<BankAccount[]>("/api/banking/accounts");
}

export function fetchDocuments(): Promise<BankDocument[]> {
  return fetchJson<BankDocument[]>("/api/banking/documents");
}

export function fetchEmployees(): Promise<EmployeeSalary[]> {
  return fetchJson<EmployeeSalary[]>("/api/banking/employees");
}

export function fetchCounterparties(): Promise<Counterparty[]> {
  return fetchJson<Counterparty[]>("/api/banking/counterparties");
}

export function fetchSummary(): Promise<BankingSummary> {
  return fetchJson<BankingSummary>("/api/banking/summary");
}

export interface OrgProfile {
  org_name: string;
  user_role: string;
  daily_payment_limit: number;
}

export interface SmartNotification {
  id: string;
  title: string;
  body: string;
  severity: string;
  category: string;
  action_url?: string;
  action_label?: string;
  due_date?: string;
  is_read: boolean;
}

export function fetchOrgProfile(): Promise<OrgProfile> {
  return fetchJson<OrgProfile>("/api/banking/org");
}

export function fetchNotifications(unreadOnly = true): Promise<SmartNotification[]> {
  const q = unreadOnly ? "?unread_only=true" : "?unread_only=false";
  return fetchJson<SmartNotification[]>(`/api/banking/notifications${q}`);
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`Banking API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function createDocument(doc: {
  type: string;
  counterparty: string;
  amount: number;
  currency: string;
  purpose: string;
}): Promise<BankDocument> {
  return postJson<BankDocument>("/api/banking/documents", doc);
}

export function signDocument(docId: string): Promise<BankDocument> {
  return postJson<BankDocument>(`/api/banking/documents/${encodeURIComponent(docId)}/sign`);
}

export function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>(`/api/banking/notifications/${encodeURIComponent(id)}/read`);
}
