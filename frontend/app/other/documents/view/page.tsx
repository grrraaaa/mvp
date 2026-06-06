"use client";

import { Suspense } from "react";
import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import { DocumentDetailView } from "@/components/banking/DocumentDetailView";

export default function DocumentViewPage() {
  return (
    <SbbolAppLayout>
      <Suspense fallback={<p className="p-8 text-center text-gray-500">Загрузка…</p>}>
        <DocumentDetailView />
      </Suspense>
    </SbbolAppLayout>
  );
}
