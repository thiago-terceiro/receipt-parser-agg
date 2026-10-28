import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { isCredentialsAuthEnabled, isTestAuthEnabled } from "@/auth";
import { GoogleAuthControls } from "@/components/google-auth-controls";
import { JsonLd } from "@/components/JsonLd";
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

const defaultSiteUrl = "https://receipt-parser-agg.vercel.app";

const getMetadataBase = (): URL => {
  const envUrl =
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  try {
    return new URL(envUrl || defaultSiteUrl);
  } catch {
    return new URL(defaultSiteUrl);
  }
};

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
      metadataBase: getMetadataBase(),
      title: "Not Found",
    };
  }

  const t = await getTranslations({
    locale: getLocaleFromSegment(locale),
    namespace: "metadata",
  });

  return {
    metadataBase: getMetadataBase(),
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

  const hasGoogleAuthConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const hasGitHubAuthConfigured = Boolean(
    (process.env.AUTH_GITHUB_ID || process.env.GITHUB_ID) &&
    (process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_SECRET),
  );

  return (
    <NextIntlClientProvider>
      <JsonLd />
      <LocaleEffects>
        <div className="mx-auto w-[min(1180px,calc(100vw-32px))] px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1180px)] max-[900px]:pt-5">
          <GoogleAuthControls
            canUseGoogleAuth={hasGoogleAuthConfigured}
            canUseGitHubAuth={hasGitHubAuthConfigured}
            isCredentialsAuthEnabled={isCredentialsAuthEnabled()}
            isTestAuthEnabled={isTestAuthEnabled()}
          />
          <main>{children}</main>
        </div>
      </LocaleEffects>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
