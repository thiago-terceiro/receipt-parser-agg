import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { LocaleEffects } from "@/components/locale-utils";
import { routing } from "@/i18n/routing";
import {
  getLocaleFromSegment,
  getLocaleSegment,
  isLocaleSegment,
} from "@/lib/i18n/config";

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

  const t = await getTranslations({
    locale: getLocaleFromSegment(locale),
    namespace: "metadata",
  });

  return {
    title: { default: t("title"), template: "%s | Receipt Aggregator AI" },
    description: t("description"),
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
    <NextIntlClientProvider>
      <LocaleEffects>
        <main className="mx-auto w-[min(1180px,calc(100vw-32px))] px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1180px)] max-[900px]:pt-5">
          {children}
        </main>
      </LocaleEffects>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
