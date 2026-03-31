import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LocaleProvider } from "@/components/locale-provider";
import { getLocaleFromSegment, isLocaleSegment } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export const generateStaticParams = () => [{ locale: "en" }, { locale: "es" }, { locale: "pt-br" }];

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

  const resolvedLocale = getLocaleFromSegment(locale);
  const translations = getMessages(resolvedLocale);

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

  return <LocaleProvider locale={getLocaleFromSegment(locale)}>{children}</LocaleProvider>;
};

export default LocaleLayout;
