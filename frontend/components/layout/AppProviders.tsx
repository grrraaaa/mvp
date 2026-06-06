"use client";

import { ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AssistantFloatingChat } from "@/components/assistant/AssistantFloatingChat";
import { DocumentTypeSelectionModal } from "@/components/sbbol/DocumentTypeSelectionModal";
import { SbbolUiContext } from "@/components/layout/SbbolUiContext";
import { AssistantUiBridge } from "@/components/assistant/AssistantUiBridge";
import { TtsBootstrap } from "@/components/assistant/TtsBootstrap";
import { useAuthStore } from "@/store/authStore";

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
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const isLoginPage = pathname === "/login";
  const showBankingExtras = Boolean(token) && !isLoginPage;

  const [chatOpen, setChatOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);

  useEffect(() => {
    if (!showBankingExtras) {
      setChatOpen(false);
    }
  }, [showBankingExtras]);

  const ui = useMemo(
    () => ({
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
      {showBankingExtras && (
        <>
          <TtsBootstrap />
          <AssistantUiBridge />
          <AssistantFloatingChat open={chatOpen} onOpenChange={setChatOpen} />
        </>
      )}
      {showBankingExtras && docModalOpen && documentModalHtml ? (
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
