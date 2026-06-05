"use client";

import { ReactNode, useEffect, useState } from "react";
import { AppProviders } from "@/components/layout/AppProviders";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface Props {
  children: ReactNode;
  documentModalHtml: string;
}

/** Mount app only on client — avoids hydration mismatch from browser extensions (e.g. bis_skin_checked). */
export function ClientRoot({ children, documentModalHtml }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div
        className="sbbol-app min-h-screen bg-sbbol-bg"
        aria-busy="true"
        aria-label="Загрузка"
        suppressHydrationWarning
      />
    );
  }

  return (
    <AuthGuard>
      <AppProviders documentModalHtml={documentModalHtml}>{children}</AppProviders>
    </AuthGuard>
  );
}
