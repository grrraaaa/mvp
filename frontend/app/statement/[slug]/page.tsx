import { SbbolRoutePage } from "@/components/sbbol/SbbolRoutePage";
import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import StatementView from "@/components/banking/StatementView";

export default async function StatementSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "account") {
    return (
      <SbbolAppLayout activeNav="statement">
        <StatementView />
      </SbbolAppLayout>
    );
  }
  return <SbbolRoutePage path={`/statement/${slug}`} />;
}
