import { SbbolRoutePage } from "@/components/sbbol/SbbolRoutePage";

export default async function SalarySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SbbolRoutePage path={`/salary/${slug}`} />;
}
