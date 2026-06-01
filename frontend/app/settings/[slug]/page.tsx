import { SbbolRoutePage } from "@/components/sbbol/SbbolRoutePage";

export default async function SettingsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SbbolRoutePage path={`/settings/${slug}`} />;
}
