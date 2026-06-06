"use client";

import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import ProductDocumentsView from "@/components/banking/ProductDocumentsView";

export default function InfoRequestsPage() {
  return (
    <SbbolAppLayout>
      <ProductDocumentsView
        title="Запросы выписки, информации"
        docPrefix="INFO:"
        backHref="/other"
        variant="info"
        showImport={false}
        filter2Label="Номер документа"
        defaultTab="draft"
        hideAmount
        docRefLabel=""
      />
    </SbbolAppLayout>
  );
}
