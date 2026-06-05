"use client";

import { useMemo } from "react";
import { SyntheticPageBody } from "@/components/sbbol/SyntheticPageBody";
import {
  hydrateSyntheticPageBody,
  type SyntheticPageBody as PageBody,
} from "@/lib/sbbol/syntheticPageContent";
import { useBankingStore } from "@/store/bankingStore";
import { useAuthStore } from "@/store/authStore";

interface Props {
  path: string;
  body: PageBody;
}

export function SbbolHydratedBody({ path, body }: Props) {
  const accounts = useBankingStore((s) => s.accounts);
  const documents = useBankingStore((s) => s.documents);
  const counterparties = useBankingStore((s) => s.counterparties);
  const orgName = useAuthStore((s) => s.user?.org_name) ?? "DEMO ЮРИДИЧЕСКОЕ ЛИЦО";

  const hydrated = useMemo(
    () =>
      hydrateSyntheticPageBody(body, path, {
        orgName,
        accounts,
        documents,
        counterparties,
      }),
    [body, path, orgName, accounts, documents, counterparties],
  );

  return <SyntheticPageBody body={hydrated} />;
}
