"use client";

import { createContext, useContext, useEffect, useMemo } from "react";

import {
  getHtmlLang,
  localeCookieName,
  localeStorageKey,
  type AppLocale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

type LocaleContextValue = {
  locale: AppLocale;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export const persistLocalePreference = (locale: AppLocale) => {
  document.cookie = `${localeCookieName}=${encodeURIComponent(locale)}; path=/; max-age=31536000; SameSite=Lax`;
  window.localStorage.setItem(localeStorageKey, locale);
  document.documentElement.lang = getHtmlLang(locale);
};

export const LocaleProvider = ({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: AppLocale;
}) => {
  useEffect(() => {
    persistLocalePreference(locale);
  }, [locale]);

  const value = useMemo(() => ({ locale }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider.");
  }

  return context.locale;
};

export const useTranslations = () => {
  const locale = useLocale();
  return getMessages(locale);
};
