import { Undo2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
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
    <div className="grid gap-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 rounded-full border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.78rem] font-semibold text-muted-foreground hover:bg-[var(--surface-plain-soft)]"
        >
          <Link href="/" locale={resolvedLocale}>
            <Undo2 className="size-4" aria-hidden="true" />
            <span>{t("backToHome")}</span>
          </Link>
        </Button>
      </div>

      <header className="grid gap-2">
        <p className="m-0 text-[0.76rem] font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
          {t("eyebrow")}
        </p>
        <p className="m-0 max-w-[62ch] text-[1.02rem] leading-7 text-muted-foreground">
          {t("heroDescription")}
        </p>
      </header>

      <Suspense fallback={<GroceriesDashboardSkeleton eyebrow={t("eyebrow")} />}>
        <GroceriesDashboardContent
          currentMonth={currentMonth}
          locale={resolvedLocale}
          month={month}
          requestedBoardId={requestedBoardId}
        />
      </Suspense>
    </div>
  );
};

export default GroceriesPage;
