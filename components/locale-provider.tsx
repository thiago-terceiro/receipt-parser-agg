"use client";

import { useLocale as useNextLocale, useTranslations as useNextTranslations } from "next-intl";
import { useEffect, useMemo } from "react";

import {
    getHtmlLang,
    localeCookieName,
    localeStorageKey,
    type AppLocale,
} from "@/lib/i18n/config";
import { createMessagesObject, type Messages } from "@/lib/i18n/messages";

export const persistLocalePreference = (locale: AppLocale) => {
  document.cookie = `${localeCookieName}=${encodeURIComponent(locale)}; path=/; max-age=31536000; SameSite=Lax`;
  window.localStorage.setItem(localeStorageKey, locale);
  document.documentElement.lang = getHtmlLang(locale);
};

export const LocaleEffects = ({
  children,
  locale,
}: React.PropsWithChildren<{
  locale: AppLocale;
}>) => {
  useEffect(() => {
    persistLocalePreference(locale);
  }, [locale]);

  return <>{children}</>;
};

export const useLocale = (): AppLocale => {
  return useNextLocale() as AppLocale;
};

export const useTranslations = (): Messages => {
  const locale = useLocale();
  const t = useNextTranslations();

  return useMemo(
    () =>
      createMessagesObject((key, values) => t(key as never, values as never), locale),
    [locale, t],
  );
};
