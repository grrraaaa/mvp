import { SbbolRoutePage } from "@/components/sbbol/SbbolRoutePage";

export default async function OtherCatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <SbbolRoutePage path={`/other/${slug.join("/")}`} />;
}
