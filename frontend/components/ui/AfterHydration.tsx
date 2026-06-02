"use client";

import { ReactNode, useEffect, useState } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renders children only after mount — avoids SSR/client mismatch (e.g. browser extensions). */
export function AfterHydration({ children, fallback = null }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <>{fallback}</>;
  return <>{children}</>;
}
