"use client";

import { SbbolAppLayout } from "@/components/layout/SbbolAppLayout";
import ProductLandingView from "@/components/banking/ProductLandingView";
import { getProductBySlug } from "@/lib/banking/productCatalog";

export default function ProductSlugResolver({ slug }: { slug: string }) {
  const item = getProductBySlug(slug);
  if (!item) return null;
  return (
    <SbbolAppLayout>
      <ProductLandingView item={item} />
    </SbbolAppLayout>
  );
}
