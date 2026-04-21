"use client";

import {
  useLocale as useNextLocale,
  useTranslations as useNextTranslations,
} from "next-intl";
import { useEffect, useMemo } from "react";

import {
  getHtmlLang,
  type AppLocale,
} from "@/lib/i18n/config";
import { createMessagesObject, type Messages } from "@/lib/i18n/messages";

export const syncDocumentLocale = (locale: AppLocale) => {
  document.documentElement.lang = getHtmlLang(locale);
};

export const LocaleEffects = ({
  children,
}: React.PropsWithChildren) => {
  const locale = useLocale();

  useEffect(() => {
    syncDocumentLocale(locale);
  }, [locale]);

  return children;
};

export const useLocale = (): AppLocale => {
  return useNextLocale() as AppLocale;
};

export const useTranslations = (): Messages => {
  const locale = useLocale();
  const t = useNextTranslations();

  return useMemo(
    () =>
      createMessagesObject(
        (key, values) => t(key as never, values as never),
        locale,
      ),
    [locale, t],
  );
};
