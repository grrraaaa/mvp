import { SbbolCapturedRoute } from "@/components/sbbol/SbbolCapturedRoute";
import { getCapturedPageHtml } from "@/lib/sbbol/capturedOrigHtml";

export default function PaydocCurPage() {
  const html = getCapturedPageHtml("/payments/paydoccur");
  if (!html) return null;

  return <SbbolCapturedRoute activeNav="payments" route="/payments/paydoccur" html={html} />;
}
