import { create } from "zustand";

interface AssistantDockState {
  /** Свёрнута ли док-панель на desktop (кнопка X) */
  collapsed: boolean;
  /** Bottom sheet ассистента на mobile */
  mobileOpen: boolean;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
  toggle: () => void;
  /** Раскрыть ассистента (deep links, кнопки в интерфейсе) */
  expand: () => void;
  /** Переключить панель (navbar «ИИ-ассистент») */
  toggleChat: () => void;
}

const MOBILE_ASSISTANT_BP = 1024;

function isMobileAssistantViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${MOBILE_ASSISTANT_BP - 1}px)`).matches;
}

export const useAssistantDockStore = create<AssistantDockState>((set, get) => ({
  collapsed: false,
  mobileOpen: false,
  setCollapsed: (v) => set({ collapsed: v }),
  setMobileOpen: (v) => set({ mobileOpen: v }),
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  expand: () => set({ collapsed: false, mobileOpen: true }),
  toggleChat: () => {
    if (isMobileAssistantViewport()) {
      set((s) => ({ mobileOpen: !s.mobileOpen }));
      return;
    }
    const { collapsed } = get();
    set({ collapsed: !collapsed });
  },
}));
