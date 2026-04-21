import { cookies, headers } from "next/headers";

import {
  buildLocalizedUrl,
  localeCookieName,
  resolveRequestLocale,
} from "@/lib/i18n/config";

export const getPreferredLocalizedUrl = async (
  pathname: string,
  searchParams?: URLSearchParams,
) => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveRequestLocale({
    cookieLocale: cookieStore.get(localeCookieName)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });

  return buildLocalizedUrl(pathname, locale, searchParams);
};