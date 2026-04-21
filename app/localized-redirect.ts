import { cookies, headers } from "next/headers";

import { localeCookieName, resolveRequestLocale } from "@/lib/i18n/config";

export const getPreferredLocale = async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return resolveRequestLocale({
    cookieLocale: cookieStore.get(localeCookieName)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });
};