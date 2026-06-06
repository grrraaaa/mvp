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

export function fetchDocument(docId: string): Promise<BankDocument> {
  return fetchJson<BankDocument>(`/api/banking/documents/${encodeURIComponent(docId)}`);
}

export function fetchDocuments(params?: {
  docType?: string;
  docPrefix?: string;
  status?: string;
}): Promise<BankDocument[]> {
  const q = new URLSearchParams();
  if (params?.docType) q.set("doc_type", params.docType);
  if (params?.docPrefix) q.set("doc_prefix", params.docPrefix);
  if (params?.status) q.set("status", params.status);
  const suffix = q.toString() ? `?${q}` : "";
  return fetchJson<BankDocument[]>(`/api/banking/documents${suffix}`);
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
  status?: string;
}): Promise<BankDocument> {
  return postJson<BankDocument>("/api/banking/documents", doc);
}

export function signDocument(docId: string): Promise<BankDocument> {
  return postJson<BankDocument>(`/api/banking/documents/${encodeURIComponent(docId)}/sign`);
}

export function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>(`/api/banking/notifications/${encodeURIComponent(id)}/read`);
}

export interface StatementLine {
  id: string;
  account_id: string;
  operation_date: string;
  debit: number;
  credit: number;
  balance_after: number;
  counterparty: string;
  purpose: string;
  doc_ref: string;
}

export function fetchStatement(accountId?: string, period = "month"): Promise<StatementLine[]> {
  const params = new URLSearchParams({ period });
  if (accountId) params.set("account_id", accountId);
  return fetchJson<StatementLine[]>(`/api/banking/statement?${params}`);
}

export function createPaymentRequest(requestType: string, payload: Record<string, unknown>) {
  return postJson<{ id: string; request_type: string; status: string }>("/api/banking/requests", {
    request_type: requestType,
    payload,
  });
}

export function createEmployee(body: {
  full_name: string;
  card_mask: string;
  amount: number;
}) {
  return postJson<EmployeeSalary>("/api/banking/employees", body);
}

export function createAccount(body: {
  currency: string;
  label?: string;
  account_type?: string;
}) {
  return postJson<BankAccount>("/api/banking/accounts", body);
}

export function patchAccountNote(accountId: string, note: string) {
  return fetch(apiUrl(`/api/banking/accounts/${encodeURIComponent(accountId)}/note`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ note }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`PATCH note: ${res.status}`);
    return res.json() as Promise<BankAccount>;
  });
}

export interface ChartSpec {
  type: string;
  title: string;
  labels: string[];
  datasets: { label: string; data: number[] }[];
  currency?: string;
}

export function fetchAnalyticsMonthly(month?: string) {
  const q = month ? `?month=${encodeURIComponent(month)}` : "";
  return fetchJson<{ items: { category: string; amount: number }[]; chart: ChartSpec | null }>(
    `/api/banking/analytics/monthly${q}`,
  );
}
