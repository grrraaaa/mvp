import { SubPageContent } from "@/components/sbbol/SubPageContent";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SubPageContent path={`/settings/${slug}`} />;
}
