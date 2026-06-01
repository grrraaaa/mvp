"use client";

import { CapturedSbbolPage } from "@/components/sbbol/CapturedSbbolPage";
import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import { getOrigPageInteractionConfig } from "@/lib/sbbol/origPageRoutes";
import type { NavId } from "@/lib/sbbol/navigation";
import type { OrigPageInteractionConfig } from "@/lib/sbbol/origPageRoutes";

interface Props {
  activeNav: NavId;
  route: string;
  html: string;
  interactions?: OrigPageInteractionConfig;
}

/** Layout + captured HTML for payments / forms. */
export function SbbolCapturedRoute({ activeNav, route, html, interactions }: Props) {
  const { openDocumentModal } = useSbbolUi();

  const resolved: OrigPageInteractionConfig = {
    ...getOrigPageInteractionConfig(route),
    ...interactions,
    ...(route === "/payments" ? { onCreateDoc: openDocumentModal } : {}),
  };

  return (
    <SbbolAppLayout activeNav={activeNav}>
      <CapturedSbbolPage html={html} interactions={resolved} />
    </SbbolAppLayout>
  );
}
