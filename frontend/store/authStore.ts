import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { setTokenRef } from "@/lib/auth/tokenRef";

export interface AuthUser {
  id: string;
  login: string;
  org_id: string;
  org_name: string;
  display_name?: string;
  user_role: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        setTokenRef(token);
        set({ token, user });
      },
      clearAuth: () => {
        setTokenRef(null);
        set({ token: null, user: null });
      },
      isAuthenticated: () => Boolean(get().token),
    }),
    {
      name: "sbbol-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        setTokenRef(state?.token ?? null);
      },
    },
  ),
);

export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}
