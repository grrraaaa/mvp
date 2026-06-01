import { PaymentFormPageContent } from "@/components/sbbol/PaymentFormPageContent";
import { getDemoPageHtml } from "@/lib/sbbol/demoPageHtml";
import { notFound } from "next/navigation";

export default function InstantPaymentPage() {
  const html = getDemoPageHtml("/payments/instant");
  if (!html) notFound();
  return <PaymentFormPageContent route="/payments/instant" html={html} />;
}
