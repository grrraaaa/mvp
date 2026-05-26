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
  url: string;
  variant: "primary" | "secondary";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: BankProduct[];
  actionButtons?: ActionButton[];
  navigationPath?: NavigationStep[];
}

interface AssistantState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
  navigationPath: NavigationStep[] | null;
  // actions
  addMessage: (msg: ChatMessage) => void;
  setLoading: (v: boolean) => void;
  setNavigationPath: (path: NavigationStep[] | null) => void;
  clearSession: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  messages: [],
  isLoading: false,
  sessionId: null,
  navigationPath: null,

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  setLoading: (v) => set({ isLoading: v }),

  setNavigationPath: (path) => set({ navigationPath: path }),

  clearSession: () =>
    set({ messages: [], sessionId: null, navigationPath: null }),
}));
