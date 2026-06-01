/** API base: same origin on Vercel, localhost:8000 in local dev. */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured !== undefined && configured !== "") {
    return configured.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return "";
  }
  return "http://127.0.0.1:8000";
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
