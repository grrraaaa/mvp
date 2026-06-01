"use client";

import { SbbolOrigPageContent } from "@/components/sbbol/SbbolOrigPageContent";
import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import { getOrigPageInteractionConfig } from "@/lib/sbbol/origPageRoutes";

interface Props {
  pageHtml: string;
}

export function PaymentsPageContent({ pageHtml }: Props) {
  const { openDocumentModal } = useSbbolUi();
  const interactions = {
    ...getOrigPageInteractionConfig("/payments"),
    onCreateDoc: openDocumentModal,
  };

  return (
    <SbbolAppLayout activeNav="payments">
      <SbbolOrigPageContent html={pageHtml} interactions={interactions} />
    </SbbolAppLayout>
  );
}
