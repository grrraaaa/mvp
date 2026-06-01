/** Document type keys from DocumentTypesModal `name="modal.docIcon.*"` buttons. */
export const PAYMENT_DOCUMENT_ROUTES: Record<string, string> = {
  PAYDOCBY: "/payments/paydocbyn",
  INSTANT_PAYMENT_ORDER: "/payments/instant",
  PAYDOCCUR: "/payments/paydoccur",
};

export function routeForDocumentType(name: string | null | undefined): string | null {
  if (!name?.startsWith("modal.docIcon.")) return null;
  const docType = name.slice("modal.docIcon.".length);
  return PAYMENT_DOCUMENT_ROUTES[docType] ?? null;
}
