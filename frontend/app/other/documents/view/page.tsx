import { Suspense } from "react";
import { DocumentDetailView } from "@/components/banking/DocumentDetailView";

export default function DocumentViewPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-gray-500">Загрузка…</p>}>
      <DocumentDetailView />
    </Suspense>
  );
}
