import { PaymentFormPageContent } from "@/components/sbbol/PaymentFormPageContent";
import { getDemoPageHtml } from "@/lib/sbbol/demoPageHtml";
import { notFound } from "next/navigation";

export default function PaydoccurPage() {
  const html = getDemoPageHtml("/payments/paydoccur");
  if (!html) notFound();
  return <PaymentFormPageContent route="/payments/paydoccur" html={html} />;
}
