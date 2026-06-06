import { SbbolRoutePage } from "@/components/sbbol/SbbolRoutePage";
import { getProductBySlug } from "@/lib/banking/productCatalog";
import ProductSlugResolver from "./ProductSlugResolver";

export default async function ProductsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalogItem = getProductBySlug(slug);

  if (catalogItem?.pageType === "landing") {
    return <ProductSlugResolver slug={slug} />;
  }

  return <SbbolRoutePage path={`/products/${slug}`} />;
}
