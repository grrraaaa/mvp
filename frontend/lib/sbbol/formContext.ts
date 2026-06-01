/** Detect SBBOL payment form context from pathname for AI assistant bridge. */

export type SbbolFormType = "paydocby" | "instant" | "paydoccur";

const ROUTE_FORM_MAP: Record<string, SbbolFormType> = {
  "/payments/paydocbyn": "paydocby",
  "/payments/instant": "instant",
  "/payments/paydoccur": "paydoccur",
};

export interface SbbolPageContext {
  page_route: string;
  form_type: SbbolFormType | null;
}

export function getSbbolPageContext(pathname: string): SbbolPageContext {
  const route = pathname.replace(/\/$/, "") || "/";
  return {
    page_route: route,
    form_type: ROUTE_FORM_MAP[route] ?? null,
  };
}

export function isPaymentFormRoute(pathname: string): boolean {
  return getSbbolPageContext(pathname).form_type !== null;
}
