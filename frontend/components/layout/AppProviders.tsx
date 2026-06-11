"use client";

import { ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import CreateDocumentModal from "@/components/banking/CreateDocumentModal";
import { SbbolUiContext } from "@/components/layout/SbbolUiContext";
import { AssistantUiBridge } from "@/components/assistant/AssistantUiBridge";
import { FormFillBridge } from "@/components/assistant/FormFillBridge";
import { RoleCharacterSync } from "@/components/assistant/RoleCharacterSync";
import { TtsBootstrap } from "@/components/assistant/TtsBootstrap";
import { GatewayStatusBanner } from "@/components/banking/GatewayStatusBanner";
import { ServiceApplicationModal } from "@/components/banking/ServiceApplicationModal";
import { useAuthStore } from "@/store/authStore";
import { useAssistantDockStore } from "@/store/assistantDockStore";

interface Props {
  children: ReactNode;
  documentModalHtml?: string;
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

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceModalName, setServiceModalName] = useState<string | undefined>();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }
  }, []);

  const ui = useMemo(
    () => ({
      openDocumentModal: () => setDocModalOpen(true),
      openChat: () => useAssistantDockStore.getState().expand(),
      openServiceApplication: (serviceName?: string) => {
        setServiceModalName(serviceName);
        setServiceModalOpen(true);
      },
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
          <RoleCharacterSync />
          <AssistantUiBridge />
          <FormFillBridge />
          <GatewayStatusBanner />
        </>
      )}
      {showBankingExtras && docModalOpen ? (
        <CreateDocumentModal isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} />
      ) : null}
      {showBankingExtras && serviceModalOpen ? (
        <ServiceApplicationModal
          serviceName={serviceModalName}
          onClose={() => setServiceModalOpen(false)}
        />
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
