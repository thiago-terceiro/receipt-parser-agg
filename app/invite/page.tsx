import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  buildLocalizedUrl,
  localeCookieName,
  resolveRequestLocale,
} from "@/lib/i18n/config";

const InviteRedirectPage = async ({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const locale = resolveRequestLocale({
    cookieLocale: cookieStore.get(localeCookieName)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });

  const redirectParams = new URLSearchParams();
  if (resolvedSearchParams?.token) {
    redirectParams.set("token", resolvedSearchParams.token);
  }

  redirect(buildLocalizedUrl("/invite", locale, redirectParams));
};

export default InviteRedirectPage;