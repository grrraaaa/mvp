import { PaymentsPageContent } from "@/components/sbbol/PaymentsPageContent";
import { getDemoPageHtml } from "@/lib/sbbol/demoPageHtml";
import { SubPageContent } from "@/components/sbbol/SubPageContent";

export default function PaymentsPage() {
  const pageHtml = getDemoPageHtml("/payments");

  if (pageHtml) {
    return <PaymentsPageContent pageHtml={pageHtml} />;
  }

  return <SubPageContent path="/payments" />;
}
