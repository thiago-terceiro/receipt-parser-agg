import { defineRouting } from "next-intl/routing";

import { appLocales, defaultLocale, localeCookieName } from "@/lib/i18n/config";

export const routing = defineRouting({
  locales: appLocales,
  defaultLocale,
  localePrefix: {
    mode: "always",
    prefixes: {
      "pt-BR": "/pt-br",
    },
  },
  localeCookie: {
    name: localeCookieName,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  },
});
