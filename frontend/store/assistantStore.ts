import { create } from "zustand";
import type { ChoiceCard } from "@/components/assistant/ChoiceCards";

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
  match_score?: number;
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

export interface SourceRef {
  index: number;
  label: string;
  kind?: string;
  id?: string;
  url?: string;
  highlight_fields?: string[];
}

export interface ChartSpec {
  type: string;
  title: string;
  labels: string[];
  datasets: { label: string; data: number[] }[];
  currency?: string;
}

export interface ForecastPayload {
  type: "forecast";
  horizon_days: number;
  as_of: string;
  current_balance: number;
  minimum: number;
  minimum_day: number;
  gap_detected: boolean;
  recommendation: string;
  x_labels: string[];
  values: number[];
  notes?: string[];
  provider?: "openai" | "rule-based";
}

export interface ChartPayloadMap {
  forecast?: ForecastPayload;
  balance?: Record<string, unknown>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: BankProduct[];
  actionButtons?: ActionButton[];
  navigationPath?: NavigationStep[];
  pendingFormFields?: string[];
  formFillStatus?: string;
  sources?: SourceRef[];
  charts?: ChartSpec[];
  /** Специализированные графики (forecast, balance и т.д.) — рендерим как карточки, а не PNG. */
  chartPayload?: ChartPayloadMap | null;
  streaming?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: BankProduct[];
  actionButtons?: ActionButton[];
  navigationPath?: NavigationStep[];
  pendingFormFields?: string[];
  formFillStatus?: string;
  sources?: SourceRef[];
  charts?: ChartSpec[];
  /** Структурированные карточки выбора (radio/чекбоксы + «Рекомендуем»). */
  choiceCards?: ChoiceCard[];
  streaming?: boolean;
}

interface AssistantState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
  navigationPath: NavigationStep[] | null;
  formActions: FormFieldAction[] | null;
  suggestedChips: string[];
  lastEmotion: string | null;
  useStreaming: boolean;
  historyLoaded: boolean;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistant: (patch: Partial<ChatMessage>) => void;
  setLoading: (v: boolean) => void;
  setNavigationPath: (path: NavigationStep[] | null) => void;
  applyFormActions: (actions: FormFieldAction[]) => void;
  clearFormActions: () => void;
  setSessionId: (id: string) => void;
  setSuggestedChips: (chips: string[]) => void;
  setLastEmotion: (e: string | null) => void;
  setUseStreaming: (v: boolean) => void;
  loadMessages: (msgs: ChatMessage[]) => void;
  switchSession: (id: string, msgs: ChatMessage[]) => void;
  clearSession: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  messages: [],
  isLoading: false,
  sessionId: null,
  navigationPath: null,
  formActions: null,
  suggestedChips: [],
  lastEmotion: null,
  useStreaming: true,
  historyLoaded: false,

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  updateLastAssistant: (patch) =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], ...patch };
          break;
        }
      }
      return { messages: msgs };
    }),

  setLoading: (v) => set({ isLoading: v }),

  setNavigationPath: (path) => set({ navigationPath: path }),

  applyFormActions: (actions) => set({ formActions: actions }),

  clearFormActions: () => set({ formActions: null }),

  setSessionId: (id) => set({ sessionId: id }),

  setSuggestedChips: (chips) => set({ suggestedChips: chips }),

  setLastEmotion: (e) => set({ lastEmotion: e }),

  setUseStreaming: (v) => set({ useStreaming: v }),

  loadMessages: (msgs) => set({ messages: msgs, historyLoaded: true }),

  switchSession: (id, msgs) =>
    set({
      sessionId: id,
      messages: msgs,
      historyLoaded: true,
      suggestedChips: [],
      navigationPath: null,
      formActions: null,
    }),

  clearSession: () =>
    set({
      messages: [],
      sessionId: null,
      navigationPath: null,
      formActions: null,
      suggestedChips: [],
      historyLoaded: false,
    }),
}));
