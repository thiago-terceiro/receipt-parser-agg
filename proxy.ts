import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { normalizeLegacyLocalePathname } from "@/lib/i18n/config";
import {
  getMarkdownContentForRoute,
  getMarkdownHeaders,
  isMarkdownRequested,
} from "@/lib/markdown-negotiation";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Check for AI-first content negotiation (Accept: text/markdown)
  if (isMarkdownRequested(request.headers.get("accept"))) {
    const markdown = getMarkdownContentForRoute(request.nextUrl.pathname);
    return new NextResponse(markdown, {
      status: 200,
      headers: getMarkdownHeaders(),
    });
  }

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
