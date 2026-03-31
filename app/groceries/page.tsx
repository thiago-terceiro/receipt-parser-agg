import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  buildLocalizedUrl,
  localeCookieName,
  resolveRequestLocale,
} from "@/lib/i18n/config";

type GroceriesPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

const GroceriesPage = async ({ searchParams }: GroceriesPageProps) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const params = new URLSearchParams();
  if (resolvedSearchParams?.month) {
    params.set("month", resolvedSearchParams.month);
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveRequestLocale({
    cookieLocale: cookieStore.get(localeCookieName)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });

  redirect(buildLocalizedUrl("/groceries", locale, params));
};

export default GroceriesPage;
