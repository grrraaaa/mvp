import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Закрывает весь сайт паролем на Vercel (и локально, если задан SITE_ACCESS_PASSWORD).
 * Только вы знаете логин/пароль из переменных окружения Vercel.
 */
export function middleware(request: NextRequest) {
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
