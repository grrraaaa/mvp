const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Query keys that may carry a bank document UUID. */
const DOC_ID_PARAMS = ["doc", "source_doc", "highlight", "document_id"] as const;

export function isDocumentUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

/** Extract document id from URL search params (highlight=uuid, doc=uuid, …). */
export function parseDocumentIdFromSearch(
  search: string | URLSearchParams,
): string | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  for (const key of DOC_ID_PARAMS) {
    const raw = params.get(key);
    if (isDocumentUuid(raw)) return raw!.trim();
  }
  return null;
}

/**
 * Like parseDocumentIdFromSearch, but also accepts seed/demo ids
 * (info-demo-bulk-150, doc-42, …) — any reasonable id, not only UUID.
 * Used on the document detail page itself.
 */
export function parseAnyDocumentIdFromSearch(
  search: string | URLSearchParams,
): string | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  for (const key of DOC_ID_PARAMS) {
    const raw = params.get(key)?.trim();
    if (raw && /^[\w:.-]{1,128}$/u.test(raw)) return raw;
  }
  return null;
}

export function documentViewPath(docId: string): string {
  return `/other/documents/view?doc=${encodeURIComponent(docId)}`;
}
