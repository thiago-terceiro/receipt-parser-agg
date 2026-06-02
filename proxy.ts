import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { normalizeLegacyLocalePathname } from "@/lib/i18n/config";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const normalizedPathname = normalizeLegacyLocalePathname(request.nextUrl.pathname);

  if (normalizedPathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = normalizedPathname;
    return NextResponse.redirect(redirectUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
