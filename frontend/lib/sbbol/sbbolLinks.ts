/** Ссылки ассистента и UI — только СберБизнес (демо-пути или sbbol.bps-sberbank.by). */

export const SBBOL_PROD_ORIGIN = "https://sbbol.bps-sberbank.by";

const RETAIL_RE = /https:\/\/(?:www\.)?sber-bank\.by[^\s<]*/gi;
const SBBOL_RE = /https:\/\/sbbol\.bps-sberbank\.by[^\s<]*/gi;
const INTERNAL_RE = /(?<![\w.])(\/[\w\-/]+)/g;

const ALLOWED_PREFIXES = [
  "/",
  "/payments",
  "/statement",
  "/salary",
  "/products",
  "/services",
  "/other",
  "/settings",
  "/money",
];

export function isInternalSbbolPath(url: string): boolean {
  const path = url.split("?")[0].replace(/\/$/, "") || "/";
  return ALLOWED_PREFIXES.some((p) => path === p || (p !== "/" && path.startsWith(p + "/")));
}

export function sanitizeSbbolUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    return isInternalSbbolPath(trimmed) ? trimmed.split("?")[0].replace(/\/$/, "") || "/" : "/";
  }
  const norm = trimmed.replace(/\/$/, "");
  if (norm === SBBOL_PROD_ORIGIN || norm.startsWith(SBBOL_PROD_ORIGIN)) {
    return norm;
  }
  return "/";
}

export function normalizeAssistantLinks(text: string): string {
  return text.replace(RETAIL_RE, SBBOL_PROD_ORIGIN);
}

export function sbbolDisplayUrl(url: string): string {
  if (url.startsWith("/")) return url;
  if (url.startsWith(SBBOL_PROD_ORIGIN)) return url;
  return "/";
}

/** Resolve href for assistant message links (internal demo, SBBOL, or external official sites). */
export function assistantLinkHref(url: string): { href: string; external: boolean; label?: string } {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    return { href: sanitizeSbbolUrl(trimmed), external: false };
  }
  if (/sber-bank\.by/i.test(trimmed)) {
    return { href: SBBOL_PROD_ORIGIN, external: true };
  }
  if (trimmed.startsWith(SBBOL_PROD_ORIGIN)) {
    return { href: trimmed.replace(/\/$/, ""), external: true };
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return { href: trimmed, external: true };
  }
  return { href: "/", external: false };
}

export { INTERNAL_RE, SBBOL_RE, RETAIL_RE };
