import { getTranslations, setRequestLocale } from "next-intl/server";

import { GroceriesDashboard } from "@/contents/groceries-dashboard/GroceriesDashboard";
import { redirect } from "@/i18n/navigation";
import { BoardRouteError, requireBoardIdentity } from "@/lib/boards-server";
import {
  buildGroceriesMonthPayload,
  buildMonthOptions,
  getMonthKey,
  resolveRequestedMonth,
} from "@/lib/groceries";
import { loadGroceriesDashboardData } from "@/lib/groceries-server";
import { getLocaleFromSegment } from "@/lib/i18n/config";
import { getSessionIdentity } from "@/lib/session";

import { GroceriesSignInCard } from "./GroceriesSignInCard";

import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const shouldRecoverFromRequestedBoardError = (
  requestedBoardId: string | undefined,
  error: unknown,
) => {
  return Boolean(
    requestedBoardId
    && error instanceof BoardRouteError
    && [400, 403, 404].includes(error.statusCode),
  );
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
  const t = await getTranslations({ locale: resolvedLocale, namespace: "groceries" });
  const identity = await getSessionIdentity();

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
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedBoardId = resolvedSearchParams?.board;
  const month = resolveRequestedMonth(resolvedSearchParams?.month, currentMonth);
  const boardIdentity = await requireBoardIdentity();
  let selection;
  let entries;
  let extractedReceipts;
  let members;

  try {
    ({ selection, entries, extractedReceipts, members } = await loadGroceriesDashboardData(
      boardIdentity,
      month,
      requestedBoardId,
    ));
  } catch (error) {
    if (shouldRecoverFromRequestedBoardError(requestedBoardId, error)) {
      redirect({
        href: month === currentMonth
          ? "/groceries"
          : {
            pathname: "/groceries",
            query: { month },
          },
        locale: resolvedLocale,
      });
    }

    throw error;
  }

  const payload = buildGroceriesMonthPayload(month, entries, extractedReceipts);

  return (
    <div className="grid gap-6">
      <GroceriesDashboard
        activeBoard={selection.activeBoard}
        payload={payload}
        boards={selection.boards}
        currentMonth={currentMonth}
        members={members}
        monthOptions={buildMonthOptions(month, 12, resolvedLocale)}
      />
    </div>
  );
};

export default GroceriesPage;
