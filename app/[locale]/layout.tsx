import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { LocaleEffects } from "@/components/locale-utils";
import { routing } from "@/i18n/routing";
import {
  getLocaleFromSegment,
  getLocaleSegment,
  isLocaleSegment,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

import type { Metadata } from "next";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale: getLocaleSegment(locale) }));

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  if (!isLocaleSegment(locale)) {
    return {
      title: "Not Found",
    };
  }

  const translations = await getMessages(getLocaleFromSegment(locale));

  return {
    title: translations.metadata.title,
    description: translations.metadata.description,
  };
};

const LocaleLayout = async ({ children, params }: LocaleLayoutProps) => {
  const { locale } = await params;

  if (!isLocaleSegment(locale)) {
    notFound();
  }

  const resolvedLocale = getLocaleFromSegment(locale);

  setRequestLocale(resolvedLocale);

  return (
    <NextIntlClientProvider locale={resolvedLocale}>
      <LocaleEffects locale={resolvedLocale}>{children}</LocaleEffects>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
