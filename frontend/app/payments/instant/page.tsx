import { SbbolCapturedRoute } from "@/components/sbbol/SbbolCapturedRoute";
import { getCapturedPageHtml } from "@/lib/sbbol/capturedOrigHtml";

export default function InstantPaymentPage() {
  const html = getCapturedPageHtml("/payments/instant");
  if (!html) return null;

  return <SbbolCapturedRoute activeNav="payments" route="/payments/instant" html={html} />;
}
