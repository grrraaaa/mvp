"use client";

import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import { OneCImportView } from "@/components/banking/OneCImportView";

export default function OneCPage() {
  return (
    <SbbolAppLayout>
      <OneCImportView />
    </SbbolAppLayout>
  );
}
