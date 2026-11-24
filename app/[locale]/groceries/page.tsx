import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { getMonthKey, resolveRequestedMonth } from "@/lib/groceries";
import { getLocaleFromSegment } from "@/lib/i18n/config";
import { getSessionIdentity } from "@/lib/session";

import {
  GroceriesDashboardContent,
  GroceriesDashboardSkeleton,
} from "./GroceriesDashboardContent";
import { GroceriesSignInCard } from "./GroceriesSignInCard";

import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type GroceriesPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    board?: string;
    month?: string;
  }>;
};

const GroceriesPage = async ({ params, searchParams }: GroceriesPageProps) => {
  const { locale } = await params;
  const resolvedLocale = getLocaleFromSegment(locale);
  setRequestLocale(resolvedLocale);

  const [t, identity, resolvedSearchParams] = await Promise.all([
    getTranslations({ locale: resolvedLocale, namespace: "groceries" }),
    getSessionIdentity(),
    searchParams ?? Promise.resolve(undefined),
  ]);

  if (!identity) {
    return (
      <GroceriesSignInCard
        locale={resolvedLocale}
        title={t("signInTitle")}
        description={t("signInDescription")}
        backToHomeLabel={t("backToHome")}
      />
    );
  }

  const currentMonth = getMonthKey(new Date());
  const requestedBoardId = resolvedSearchParams?.board;
  const month = resolveRequestedMonth(resolvedSearchParams?.month, currentMonth);

  return (
    <Suspense
      fallback={
        <GroceriesDashboardSkeleton
          backToHomeLabel={t("backToHome")}
          eyebrow={t("eyebrow")}
          heroDescription={t("heroDescription")}
          locale={resolvedLocale}
        />
      }
    >
      <GroceriesDashboardContent
        currentMonth={currentMonth}
        locale={resolvedLocale}
        month={month}
        requestedBoardId={requestedBoardId}
      />
    </Suspense>
  );
};

export default GroceriesPage;
