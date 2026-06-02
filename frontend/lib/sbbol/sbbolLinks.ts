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

export { INTERNAL_RE, SBBOL_RE, RETAIL_RE };
