"use client";

import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import MoneyView from "@/components/banking/MoneyView";

export default function HomePage() {
  return (
    <SbbolAppLayout>
      <MoneyView />
    </SbbolAppLayout>
  );
}
