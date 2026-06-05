"use client";

import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import StatementView from "@/components/banking/StatementView";

export default function StatementPage() {
  return (
    <SbbolAppLayout>
      <StatementView />
    </SbbolAppLayout>
  );
}
