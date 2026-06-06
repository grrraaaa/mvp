"use client";

import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import { CounterpartyRiskView } from "@/components/banking/CounterpartyRiskView";

export default function CounterpartyCheckPage() {
  return (
    <SbbolAppLayout>
      <CounterpartyRiskView />
    </SbbolAppLayout>
  );
}
