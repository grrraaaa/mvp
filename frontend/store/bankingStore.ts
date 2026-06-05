import { create } from "zustand";
import {
  createDocument,
  fetchAccounts,
  fetchCounterparties,
  fetchDocuments,
  fetchEmployees,
  signDocument,
} from "@/lib/api/banking";
import type {
  BankAccount,
  BankDocument,
  Counterparty,
  DocumentStatus,
  EmployeeSalary,
} from "@/lib/banking/types";

interface BankingState {
  accounts: BankAccount[];
  documents: BankDocument[];
  employees: EmployeeSalary[];
  counterparties: Counterparty[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  loadAll: () => Promise<void>;
  reset: () => void;
  setAccounts: (updater: BankAccount[] | ((prev: BankAccount[]) => BankAccount[])) => void;
  setDocuments: (updater: BankDocument[] | ((prev: BankDocument[]) => BankDocument[])) => void;
  setEmployees: (updater: EmployeeSalary[] | ((prev: EmployeeSalary[]) => EmployeeSalary[])) => void;
  createPayment: (doc: Omit<BankDocument, "id" | "date" | "status"> & { date?: string }) => Promise<void>;
  signDocument: (docId: string) => Promise<void>;
  runPayroll: (accountId: string) => Promise<boolean>;
}

function applyUpdater<T>(prev: T[], updater: T[] | ((p: T[]) => T[])): T[] {
  return typeof updater === "function" ? updater(prev) : updater;
}

export const useBankingStore = create<BankingState>((set, get) => ({
  accounts: [],
  documents: [],
  employees: [],
  counterparties: [],
  loaded: false,
  loading: false,
  error: null,

  reset: () =>
    set({
      accounts: [],
      documents: [],
      employees: [],
      counterparties: [],
      loaded: false,
      loading: false,
      error: null,
    }),

  loadAll: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [accounts, documents, employees, counterparties] = await Promise.all([
        fetchAccounts(),
        fetchDocuments(),
        fetchEmployees(),
        fetchCounterparties(),
      ]);
      set({ accounts, documents, employees, counterparties, loaded: true, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load banking data";
      if (msg === "UNAUTHORIZED" && typeof window !== "undefined") {
        localStorage.removeItem("sbbol-auth");
        window.location.href = "/login";
      }
      set({ loading: false, error: msg });
    }
  },

  setAccounts: (updater) => set((s) => ({ accounts: applyUpdater(s.accounts, updater) })),
  setDocuments: (updater) => set((s) => ({ documents: applyUpdater(s.documents, updater) })),
  setEmployees: (updater) => set((s) => ({ employees: applyUpdater(s.employees, updater) })),

  createPayment: async (doc) => {
    const created = await createDocument({
      type: doc.type,
      counterparty: doc.counterparty,
      amount: doc.amount,
      currency: doc.currency,
      purpose: doc.purpose,
    });
    set((s) => ({ documents: [created, ...s.documents] }));
  },

  signDocument: async (docId) => {
    const updated = await signDocument(docId);
    set((s) => ({
      documents: s.documents.map((d) => (d.id === docId ? updated : d)),
    }));
    await get().loadAll();
  },

  runPayroll: async (accountId) => {
    const { accounts, employees } = get();
    const total = employees.reduce((sum, e) => sum + e.amount, 0);
    const account = accounts.find((a) => a.id === accountId);
    if (!account || account.balance < total || employees.length === 0) return false;

    const created = await createDocument({
      type: "Зарплатный проект",
      counterparty: `Зарплатный реестр (${employees.length} сотр.)`,
      amount: total,
      currency: "BYN",
      purpose: "Выплата заработной платы за выполненные работы по трудовому соглашению",
    });
    await signDocument(created.id);
    set((s) => ({
      employees: s.employees.map((e) => ({ ...e, status: "Оплачен" as const })),
    }));
    await get().loadAll();
    return true;
  },
}));
