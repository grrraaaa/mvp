import { create } from "zustand";

interface AssistantDockState {
  /** Свёрнута ли докая-панель (X нажали) */
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
  /** Раскрыть дока (вызывается из useSbbolUi.openChat) */
  expand: () => void;
}

export const useAssistantDockStore = create<AssistantDockState>((set) => ({
  collapsed: false,
  setCollapsed: (v) => set({ collapsed: v }),
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  expand: () => set({ collapsed: false }),
}));
