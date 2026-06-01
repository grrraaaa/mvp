import { create } from "zustand";

export interface NavigationStep {
  label: string;
  url: string;
  icon?: string;
}

export interface BankProduct {
  id: string;
  name: string;
  type: string;
  rate?: number;
  description?: string;
  url: string;
}

export interface ActionButton {
  label: string;
  url?: string;
  message?: string;
  variant: "primary" | "secondary";
}

export interface FormFieldAction {
  field: string;
  value: string;
  label?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: BankProduct[];
  actionButtons?: ActionButton[];
  navigationPath?: NavigationStep[];
  pendingFormFields?: string[];
  formFillStatus?: string;
}

interface AssistantState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
  navigationPath: NavigationStep[] | null;
  formActions: FormFieldAction[] | null;
  // actions
  addMessage: (msg: ChatMessage) => void;
  setLoading: (v: boolean) => void;
  setNavigationPath: (path: NavigationStep[] | null) => void;
  applyFormActions: (actions: FormFieldAction[]) => void;
  clearFormActions: () => void;
  setSessionId: (id: string) => void;
  clearSession: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  messages: [],
  isLoading: false,
  sessionId: null,
  navigationPath: null,
  formActions: null,

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  setLoading: (v) => set({ isLoading: v }),

  setNavigationPath: (path) => set({ navigationPath: path }),

  applyFormActions: (actions) => set({ formActions: actions }),

  clearFormActions: () => set({ formActions: null }),

  setSessionId: (id) => set({ sessionId: id }),

  clearSession: () =>
    set({ messages: [], sessionId: null, navigationPath: null, formActions: null }),
}));
