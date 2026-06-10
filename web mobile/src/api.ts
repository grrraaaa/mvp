/** Клиент FastAPI-бэкенда: данные счетов, документов и сотрудников из PostgreSQL. */

import { BankAccount, BankDocument, DocumentStatus, EmployeeSalary } from './types';

// На Vercel мобильная версия живёт на том же домене, что и /api.
// На localhost (vite dev / next dev) бэкенд крутится на 8000.
const API_BASE =
  typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://127.0.0.1:8000'
    : '';

const DEMO_LOGIN = { login: 'demo', password: 'demo' };

let token: string | null = null;

async function ensureToken(): Promise<string> {
  if (token) return token;
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(DEMO_LOGIN),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  const data = await res.json();
  token = data.access_token as string;
  return token;
}

async function getJson<T>(path: string): Promise<T> {
  const t = await ensureToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (res.status === 401) {
    token = null;
    throw new Error('unauthorized');
  }
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

interface ApiDocument {
  id: string;
  date: string;
  type: string;
  counterparty: string;
  amount: number;
  currency: string;
  status: string;
  purpose: string;
  doc_number?: string | null;
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

export interface OrgProfile {
  org_name: string;
  user_role: string;
}

export interface MobileBankData {
  accounts: BankAccount[];
  documents: BankDocument[];
  employees: EmployeeSalary[];
  notifications: SmartNotification[];
  orgName: string;
}

const KNOWN_STATUSES: DocumentStatus[] = ['Проведен', 'Черновик', 'На подписи'];

export async function loadBankData(): Promise<MobileBankData> {
  const [accounts, rawDocs, employees, notifications, org] = await Promise.all([
    getJson<BankAccount[]>('/api/banking/accounts'),
    getJson<ApiDocument[]>('/api/banking/documents'),
    getJson<EmployeeSalary[]>('/api/banking/employees'),
    getJson<SmartNotification[]>('/api/banking/notifications?unread_only=true').catch(() => [] as SmartNotification[]),
    getJson<OrgProfile>('/api/banking/org').catch(() => ({ org_name: 'Пятая команда', user_role: 'businessman' })),
  ]);

  const toTs = (date: string): number => {
    const [dd, mm, yy] = date.split('.').map(Number);
    return new Date(yy || 0, (mm || 1) - 1, dd || 1).getTime();
  };

  const documents: BankDocument[] = rawDocs
    .filter((d) => !d.type.startsWith('INFO:') && KNOWN_STATUSES.includes(d.status as DocumentStatus))
    .sort((a, b) => {
      // «На подписи» — первыми, далее свежие по дате
      const sign = Number(b.status === 'На подписи') - Number(a.status === 'На подписи');
      return sign !== 0 ? sign : toTs(b.date) - toTs(a.date);
    })
    .slice(0, 15)
    .map((d) => ({
      id: d.id,
      date: d.date,
      type: d.type,
      counterparty: d.counterparty,
      amount: d.amount,
      currency: (d.currency as BankDocument['currency']) ?? 'BYN',
      status: d.status as DocumentStatus,
      purpose: d.purpose,
    }));

  return {
    accounts: accounts.filter((a) => !a.hidden),
    documents,
    notifications,
    orgName: org.org_name,
    employees: employees.map((e) => ({
      ...e,
      status: (KNOWN_STATUSES_EMP.includes(e.status as EmployeeSalary['status'])
        ? e.status
        : 'Готов') as EmployeeSalary['status'],
    })),
  };
}

const KNOWN_STATUSES_EMP = ['Готов', 'Оплачен', 'Ошибка'];
