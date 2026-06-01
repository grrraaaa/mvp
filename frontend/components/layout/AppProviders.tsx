"use client";

import { ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AssistantFloatingChat } from "@/components/assistant/AssistantFloatingChat";
import { DocumentTypeSelectionModal } from "@/components/sbbol/DocumentTypeSelectionModal";
import { PlanetMapOverlay } from "@/components/map/PlanetMapOverlay";
import { SbbolUiContext } from "@/components/layout/SbbolUiContext";

interface Props {
  children: ReactNode;
  documentModalHtml: string;
}

function NewDocQueryOpener({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("newDoc") === "1") onOpen();
  }, [searchParams, onOpen]);

  return null;
}

function AppProvidersInner({ children, documentModalHtml }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);

  const ui = useMemo(
    () => ({
      openMap: () => setMapOpen(true),
      openDocumentModal: () => setDocModalOpen(true),
      openChat: () => setChatOpen(true),
    }),
    [],
  );

  return (
    <SbbolUiContext.Provider value={ui}>
      <Suspense fallback={null}>
        <NewDocQueryOpener onOpen={() => setDocModalOpen(true)} />
      </Suspense>
      {children}
      <AssistantFloatingChat open={chatOpen} onOpenChange={setChatOpen} />
      <PlanetMapOverlay open={mapOpen} onClose={() => setMapOpen(false)} />
      {docModalOpen && documentModalHtml ? (
        <DocumentTypeSelectionModal html={documentModalHtml} onClose={() => setDocModalOpen(false)} />
      ) : null}
    </SbbolUiContext.Provider>
  );
}

export function AppProviders({ children, documentModalHtml }: Props) {
  return (
    <Suspense fallback={null}>
      <AppProvidersInner documentModalHtml={documentModalHtml}>{children}</AppProvidersInner>
    </Suspense>
  );
}
