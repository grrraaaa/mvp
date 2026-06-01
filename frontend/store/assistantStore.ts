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
<<<<<<< HEAD
  url?: string;
  message?: string;
  variant: "primary" | "secondary";
}

export interface FormFieldAction {
  field: string;
  value: string;
  label?: string;
}

=======
  url: string;
  variant: "primary" | "secondary";
}

>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: BankProduct[];
  actionButtons?: ActionButton[];
  navigationPath?: NavigationStep[];
<<<<<<< HEAD
  pendingFormFields?: string[];
  formFillStatus?: string;
=======
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
}

interface AssistantState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
  navigationPath: NavigationStep[] | null;
<<<<<<< HEAD
  formActions: FormFieldAction[] | null;
=======
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
  // actions
  addMessage: (msg: ChatMessage) => void;
  setLoading: (v: boolean) => void;
  setNavigationPath: (path: NavigationStep[] | null) => void;
<<<<<<< HEAD
  applyFormActions: (actions: FormFieldAction[]) => void;
  clearFormActions: () => void;
  setSessionId: (id: string) => void;
=======
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
  clearSession: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  messages: [],
  isLoading: false,
  sessionId: null,
  navigationPath: null,
<<<<<<< HEAD
  formActions: null,
=======
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  setLoading: (v) => set({ isLoading: v }),

  setNavigationPath: (path) => set({ navigationPath: path }),

<<<<<<< HEAD
  applyFormActions: (actions) => set({ formActions: actions }),

  clearFormActions: () => set({ formActions: null }),

  setSessionId: (id) => set({ sessionId: id }),

  clearSession: () =>
    set({ messages: [], sessionId: null, navigationPath: null, formActions: null }),
=======
  clearSession: () =>
    set({ messages: [], sessionId: null, navigationPath: null }),
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
}));
