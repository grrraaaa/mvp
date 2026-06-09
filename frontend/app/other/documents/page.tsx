"use client";

import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import ProductDocumentsView from "@/components/banking/ProductDocumentsView";

/**
 * /other/documents — единый список всех документов организации.
 *
 * Раньше здесь была демо-заглушка с двумя фейковыми строками
 * (см. lib/sbbol/syntheticPageContent.ts), из‑за чего пользователь
 * не понимал, «откуда берутся отчёты №211 и т.п.» при поиске.
 *
 * Теперь рендерим настоящий список из БД, фильтруя по org_id
 * (без docType/docPrefix — показываем всё, что есть в bank_documents).
 * Поиск по номеру документа работает на стороне бэка через
 * smart_search / search_reports.
 */
export default function DocumentsPage() {
  return (
    <SbbolAppLayout>
      <ProductDocumentsView
        title="Документы"
        backHref="/other"
        variant="transfer"
        showImport={false}
        filter2Label="Номер документа"
        defaultTab="all"
        docRefLabel=""
        rowTitle="Документ"
        rowSubtitle=""
        createLabel="Создать документ"
      />
    </SbbolAppLayout>
  );
}
