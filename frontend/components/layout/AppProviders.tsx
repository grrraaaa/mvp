"use client";

import { ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SbbolUiContext } from "@/components/layout/SbbolUiContext";
import { AssistantUiBridge } from "@/components/assistant/AssistantUiBridge";
import { FormFillBridge } from "@/components/assistant/FormFillBridge";
import { RoleCharacterSync } from "@/components/assistant/RoleCharacterSync";
import { TtsBootstrap } from "@/components/assistant/TtsBootstrap";
import { GatewayStatusBanner } from "@/components/banking/GatewayStatusBanner";
import { ServiceApplicationModal } from "@/components/banking/ServiceApplicationModal";
import { BankingShell } from "@/components/layout/BankingShell";
import { useAuthStore } from "@/store/authStore";
import { useAssistantDockStore } from "@/store/assistantDockStore";

interface Props {
  children: ReactNode;
  documentModalHtml?: string;
}

function NewDocQueryOpener() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("newDoc") === "1") router.push("/payments");
  }, [searchParams, router]);

  return null;
}

function AppProvidersInner({ children, documentModalHtml }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const isLoginPage = pathname === "/login";
  const showBankingExtras = Boolean(token) && !isLoginPage;

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceModalName, setServiceModalName] = useState<string | undefined>();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }
  }, []);

  const ui = useMemo(
    () => ({
      openDocumentModal: () => router.push("/payments"),
      openChat: () => useAssistantDockStore.getState().expand(),
      toggleChat: () => useAssistantDockStore.getState().toggleChat(),
      openServiceApplication: (serviceName?: string) => {
        setServiceModalName(serviceName);
        setServiceModalOpen(true);
      },
    }),
    [router],
  );

  return (
    <SbbolUiContext.Provider value={ui}>
      <Suspense fallback={null}>
        <NewDocQueryOpener />
      </Suspense>
      {showBankingExtras ? <BankingShell>{children}</BankingShell> : children}
      {showBankingExtras && (
        <>
          <TtsBootstrap />
          <RoleCharacterSync />
          <AssistantUiBridge />
          <FormFillBridge />
          <GatewayStatusBanner />
        </>
      )}
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
