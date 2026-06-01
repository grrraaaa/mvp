import { SbbolRoutePage } from "@/components/sbbol/SbbolRoutePage";

export default async function MoneySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SbbolRoutePage path={`/money/${slug}`} />;
}
