"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { fetchMe } from "@/lib/api/auth";

interface Props {
  children: ReactNode;
}

export function AuthGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [hydrated, setHydrated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useAuthStore.persist.hasHydrated()) {
      finish();
      return;
    }
    return useAuthStore.persist.onFinishHydration(finish);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (pathname === "/login") {
      if (token) {
        router.replace("/");
        return;
      }
      setReady(true);
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    if (user) {
      setReady(true);
      return;
    }

    void fetchMe(token)
      .then((me) => {
        setAuth(token, me);
        setReady(true);
      })
      .catch(() => {
        clearAuth();
        router.replace("/login");
      });
  }, [hydrated, token, user, pathname, router, setAuth, clearAuth]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center text-[#138d8a] text-sm">
        Загрузка…
      </div>
    );
  }

  if (pathname === "/login") return <>{children}</>;
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center text-[#138d8a] text-sm">
        Загрузка…
      </div>
    );
  }
  return <>{children}</>;
}
