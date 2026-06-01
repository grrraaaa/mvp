import { SbbolCapturedRoute } from "@/components/sbbol/SbbolCapturedRoute";
import { getCapturedPageHtml } from "@/lib/sbbol/capturedOrigHtml";

export default function PaydocBynPage() {
  const html = getCapturedPageHtml("/payments/paydocbyn");
  if (!html) return null;

  return <SbbolCapturedRoute activeNav="payments" route="/payments/paydocbyn" html={html} />;
}
