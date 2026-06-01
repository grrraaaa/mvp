import { PaymentFormPageContent } from "@/components/sbbol/PaymentFormPageContent";
import { getDemoPageHtml } from "@/lib/sbbol/demoPageHtml";
import { notFound } from "next/navigation";

export default function PaydocbynPage() {
  const html = getDemoPageHtml("/payments/paydocbyn");
  if (!html) notFound();
  return <PaymentFormPageContent route="/payments/paydocbyn" html={html} />;
}
