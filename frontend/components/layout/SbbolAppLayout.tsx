"use client";

import { ReactNode } from "react";
import { SbbolShell } from "@/components/layout/SbbolShell";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import type { NavId } from "@/lib/sbbol/navigation";

interface Props {
  children: ReactNode;
  activeNav?: NavId;
}

export function SbbolAppLayout({ children, activeNav }: Props) {
  const { openMap } = useSbbolUi();

  return <SbbolShell activeNav={activeNav} onOpenMap={openMap}>{children}</SbbolShell>;
}
