import { SbbolRoutePage } from "@/components/sbbol/SbbolRoutePage";

export default async function StatementSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SbbolRoutePage path={`/statement/${slug}`} />;
}
