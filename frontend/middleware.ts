import { NextResponse, userAgent } from "next/server";
import type { NextRequest } from "next/server";

const DOC_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DOC_QUERY_KEYS = ["doc", "source_doc", "highlight", "document_id"] as const;

function documentIdFromRequest(request: NextRequest): string | null {
  const { searchParams } = request.nextUrl;
  for (const key of DOC_QUERY_KEYS) {
    const raw = searchParams.get(key)?.trim();
    if (raw && DOC_UUID.test(raw)) return raw;
  }
  return null;
}

/**
 * Закрывает весь сайт паролем на Vercel (и локально, если задан SITE_ACCESS_PASSWORD).
 * Только вы знаете логин/пароль из переменных окружения Vercel.
 */
export function middleware(request: NextRequest) {
  const docId = documentIdFromRequest(request);
  if (
    docId &&
    !request.nextUrl.pathname.startsWith("/other/documents/view")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/other/documents/view";
    url.search = `?doc=${encodeURIComponent(docId)}`;
    return NextResponse.redirect(url);
  }

  // Телефоны (не планшеты) видят мобильную версию из public/m (сборка "web mobile")
  const { device } = userAgent(request);
  if (device.type === "mobile" && !request.nextUrl.pathname.startsWith("/m")) {
    const url = request.nextUrl.clone();
    url.pathname = "/m";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const password = process.env.SITE_ACCESS_PASSWORD;
  if (!password) {
    if (process.env.VERCEL === "1") {
      console.warn("[middleware] SITE_ACCESS_PASSWORD не задан — сайт публичный!");
    }
    return NextResponse.next();
  }

  const expectedUser = process.env.SITE_ACCESS_USER || "admin";
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    try {
      const decoded = atob(authHeader.slice(6));
      const colon = decoded.indexOf(":");
      const user = colon >= 0 ? decoded.slice(0, colon) : "";
      const pass = colon >= 0 ? decoded.slice(colon + 1) : "";
      if (user === expectedUser && pass === password) {
        return NextResponse.next();
      }
    } catch {
      /* invalid base64 */
    }
  }

  return new NextResponse("Требуется авторизация", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Sber Demo (private)"',
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|sber-orig/).*)",
  ],
};
