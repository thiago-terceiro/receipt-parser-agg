import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  buildLocalizedUrl,
  localeCookieName,
  resolveRequestLocale,
} from "@/lib/i18n/config";

const HomePage = async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveRequestLocale({
    cookieLocale: cookieStore.get(localeCookieName)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });

  redirect(buildLocalizedUrl("/", locale));
};

export default HomePage;
