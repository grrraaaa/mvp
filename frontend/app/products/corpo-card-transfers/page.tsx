"use client";

import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import ProductDocumentsView from "@/components/banking/ProductDocumentsView";
import { CORP_CARD_DOC_TYPE } from "@/lib/banking/productCatalog";

export default function CorpoCardTransfersPage() {
  return (
    <SbbolAppLayout>
      <ProductDocumentsView
        title="Переводы на корпоративные карты"
        docType={CORP_CARD_DOC_TYPE}
      />
    </SbbolAppLayout>
  );
}
