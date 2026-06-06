"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  documentViewPath,
  parseDocumentIdFromSearch,
} from "@/lib/banking/documentDeepLink";

/**
 * Redirects ?highlight={uuid} / ?doc={uuid} to the document detail page.
 */
export function useDocumentDeepLink() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const docId = parseDocumentIdFromSearch(searchParams);
    if (!docId) return;
    if (pathname.startsWith("/other/documents/view")) return;
    router.replace(documentViewPath(docId));
  }, [searchParams, pathname, router]);
}
