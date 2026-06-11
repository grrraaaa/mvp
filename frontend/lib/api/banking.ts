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

export interface BalanceHistoryMonth {
  /** YYYY-MM */
  month: string;
  /** «Май 2026» */
  label: string;
  /** Чистый поток за месяц: credit − debit */
  amount: number;
  /** Расходы */
  debit: number;
  /** Поступления */
  credit: number;
}

export interface BalanceSummaryDetail {
  total_byn: number;
  total_eur: number;
  total_usd: number;
  total_rub: number;
  accounts: {
    iban: string;
    label: string;
    currency: string;
    balance: number;
    account_type: string;
  }[];
  history: BalanceHistoryMonth[];
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
  statuses?: string[];
  year?: number;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
  counterparty?: string;
  q?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
}): Promise<BankDocument[]> {
  const q = new URLSearchParams();
  if (params?.docType) q.set("doc_type", params.docType);
  if (params?.docPrefix) q.set("doc_prefix", params.docPrefix);
  if (params?.status) q.set("status", params.status);
  if (params?.statuses?.length) q.set("statuses", params.statuses.join(","));
  if (params?.year != null) q.set("year", String(params.year));
  if (params?.month != null) q.set("month", String(params.month));
  if (params?.dateFrom) q.set("date_from", params.dateFrom);
  if (params?.dateTo) q.set("date_to", params.dateTo);
  if (params?.counterparty) q.set("counterparty", params.counterparty);
  if (params?.q) q.set("q", params.q);
  if (params?.minAmount != null) q.set("min_amount", String(params.minAmount));
  if (params?.maxAmount != null) q.set("max_amount", String(params.maxAmount));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const suffix = q.toString() ? `?${q}` : "";
  return fetchJson<BankDocument[]>(`/api/banking/documents${suffix}`);
}

export interface DocumentFacets {
  years: number[];
  statuses: string[];
  types: string[];
  counterparties: string[];
  total: number;
}

export function fetchDocumentFacets(): Promise<DocumentFacets | null> {
  // Эндпоинта может не быть в старых деплоях — не шумим в консоли 404'ой,
  // просто вернём null, и дропдауны останутся пустыми (не критично).
  return fetchJson<DocumentFacets>("/api/banking/documents/facets").catch(
    (e: unknown) => {
      if (e instanceof Error && /404/.test(e.message)) return null;
      throw e;
    },
  );
}

/** Парсит query string (?year=2026&month=3&from=...) в объект фильтров */
export function parseDocumentsSearchParams(
  search: string | URLSearchParams,
): {
  year: number | null;
  month: number | null;
  status: string | null;
  statuses: string[];
  dateFrom: string | null;
  dateTo: string | null;
  q: string | null;
  docType: string | null;
  counterparty: string | null;
  minAmount: number | null;
  maxAmount: number | null;
} {
  const sp = typeof search === "string" ? new URLSearchParams(search) : search;
  const year = sp.get("year");
  const month = sp.get("month");
  const status = sp.get("status");
  const statuses = (sp.get("statuses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const minA = sp.get("min_amount");
  const maxA = sp.get("max_amount");
  return {
    year: year && /^\d{4}$/.test(year) ? Number(year) : null,
    month: month && /^\d{1,2}$/.test(month) ? Number(month) : null,
    status,
    statuses,
    dateFrom: sp.get("date_from") || sp.get("from") || null,
    dateTo: sp.get("date_to") || sp.get("to") || null,
    q: sp.get("q") || null,
    docType: sp.get("doc_type") || sp.get("type") || null,
    counterparty: sp.get("counterparty") || null,
    minAmount: minA && /^\d+(\.\d+)?$/.test(minA) ? Number(minA) : null,
    maxAmount: maxA && /^\d+(\.\d+)?$/.test(maxA) ? Number(maxA) : null,
  };
}

/** Сериализует фильтры обратно в query string для шаринга URL */
export function buildDocumentsQueryString(f: {
  year?: number | null;
  month?: number | null;
  status?: string | null;
  statuses?: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  q?: string | null;
  docType?: string | null;
  counterparty?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
}): string {
  const sp = new URLSearchParams();
  if (f.year != null) sp.set("year", String(f.year));
  if (f.month != null) sp.set("month", String(f.month));
  if (f.status) sp.set("status", f.status);
  if (f.statuses?.length) sp.set("statuses", f.statuses.join(","));
  if (f.dateFrom) sp.set("date_from", f.dateFrom);
  if (f.dateTo) sp.set("date_to", f.dateTo);
  if (f.q) sp.set("q", f.q);
  if (f.docType) sp.set("doc_type", f.docType);
  if (f.counterparty) sp.set("counterparty", f.counterparty);
  if (f.minAmount != null) sp.set("min_amount", String(f.minAmount));
  if (f.maxAmount != null) sp.set("max_amount", String(f.maxAmount));
  return sp.toString();
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

/** Полная сводка для «Сколько на счёте?» — реальные данные из PostgreSQL.
 *  Возвращает totals по валютам, счета и помесячную историю debit/credit. */
export function fetchBalanceSummary(
  historyMonths = 6,
): Promise<BalanceSummaryDetail> {
  return fetchJson<BalanceSummaryDetail>(
    `/api/banking/balance/summary?history_months=${historyMonths}`,
  );
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
