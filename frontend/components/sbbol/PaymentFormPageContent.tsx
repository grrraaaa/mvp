"use client";

import { SbbolOrigPageContent } from "@/components/sbbol/SbbolOrigPageContent";
import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import { getOrigPageInteractionConfig } from "@/lib/sbbol/origPageRoutes";

interface Props {
  route: string;
  html: string;
}

export function PaymentFormPageContent({ route, html }: Props) {
  return (
    <SbbolAppLayout activeNav="payments">
      <SbbolOrigPageContent html={html} interactions={getOrigPageInteractionConfig(route)} />
    </SbbolAppLayout>
  );
}
