import { SbbolRoutePage } from "@/components/sbbol/SbbolRoutePage";

export default async function PaymentsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SbbolRoutePage path={`/payments/${slug}`} />;
}
