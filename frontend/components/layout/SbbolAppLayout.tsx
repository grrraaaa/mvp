"use client";

import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  activeNav?: string;
}

/** Оболочка банка (sidebar + чат) живёт в AppProviders — здесь только children. */
export function SbbolAppLayout({ children }: Props) {
  return <>{children}</>;
}
