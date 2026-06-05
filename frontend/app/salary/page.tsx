"use client";

import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import PayrollView from "@/components/banking/PayrollView";

export default function SalaryPage() {
  return (
    <SbbolAppLayout>
      <PayrollView />
    </SbbolAppLayout>
  );
}
