"use client";

import { ReactNode } from "react";
import { BankingShell } from "@/components/layout/BankingShell";

interface Props {
  children: ReactNode;
  activeNav?: string;
}

export function SbbolAppLayout({ children }: Props) {
  return <BankingShell>{children}</BankingShell>;
}
