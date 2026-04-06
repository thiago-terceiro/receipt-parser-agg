import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { LocaleEffects } from "@/components/locale-utils";
import { routing } from "@/i18n/routing";
import { getMessages } from "@/lib/i18n/messages";

import type { Metadata } from "next";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {
      title: "Not Found",
    };
  }

  const translations = await getMessages(locale);

  return {
    title: translations.metadata.title,
    description: translations.metadata.description,
  };
};

const LocaleLayout = async ({ children, params }: LocaleLayoutProps) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <NextIntlClientProvider locale={locale}>
      <LocaleEffects locale={locale}>{children}</LocaleEffects>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
