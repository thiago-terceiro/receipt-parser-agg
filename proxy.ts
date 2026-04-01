import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildLocalizedUrl,
  localeCookieName,
  resolveRequestLocale,
} from "@/lib/i18n/config";

const PUBLIC_FILE = /\.[^/]+$/;

export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const locale = resolveRequestLocale({
    localeSegment: pathname.split("/")[1] ?? null,
    cookieLocale: request.cookies.get(localeCookieName)?.value ?? null,
    acceptLanguage: request.headers.get("accept-language"),
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-receipt-ai-locale", locale);

  const localizedPath = buildLocalizedUrl(pathname, locale, request.nextUrl.searchParams);
  if (localizedPath === `${pathname}${request.nextUrl.search}`) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.cookies.set(localeCookieName, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  const response = NextResponse.redirect(new URL(localizedPath, request.url));
  response.cookies.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};