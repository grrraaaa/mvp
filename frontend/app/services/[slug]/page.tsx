import { SbbolRoutePage } from "@/components/sbbol/SbbolRoutePage";

export default async function ServicesSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SbbolRoutePage path={`/services/${slug}`} />;
}
