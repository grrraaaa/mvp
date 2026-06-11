import { create } from "zustand";

interface AssistantDockState {
  /** Свёрнута ли док-панель на desktop (кнопка X) */
  collapsed: boolean;
  /** Bottom sheet ассистента на mobile */
  mobileOpen: boolean;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
  toggle: () => void;
  /** Раскрыть ассистента (navbar «ИИ-ассистент» и deep links) */
  expand: () => void;
}

export const useAssistantDockStore = create<AssistantDockState>((set) => ({
  collapsed: false,
  mobileOpen: false,
  setCollapsed: (v) => set({ collapsed: v }),
  setMobileOpen: (v) => set({ mobileOpen: v }),
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  expand: () => set({ collapsed: false, mobileOpen: true }),
}));
