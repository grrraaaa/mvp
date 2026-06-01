import { SbbolCapturedRoute } from "@/components/sbbol/SbbolCapturedRoute";
import { SbbolRoutePage } from "@/components/sbbol/SbbolRoutePage";
import { getCapturedPageHtml } from "@/lib/sbbol/capturedOrigHtml";

export default function PaymentsPage() {
  const pageHtml = getCapturedPageHtml("/payments");

  if (pageHtml) {
    return <SbbolCapturedRoute activeNav="payments" route="/payments" html={pageHtml} />;
  }

  return <SbbolRoutePage path="/payments" />;
}
