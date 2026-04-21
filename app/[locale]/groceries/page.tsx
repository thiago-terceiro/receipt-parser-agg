import { getTranslations, setRequestLocale } from "next-intl/server";

import { GroceriesDashboard } from "@/contents/groceries-dashboard/GroceriesDashboard";
import { requireBoardIdentity } from "@/lib/boards-server";
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
  const { selection, entries, extractedReceipts, members } = await loadGroceriesDashboardData(
    boardIdentity,
    month,
    requestedBoardId,
  );

  const payload = buildGroceriesMonthPayload(month, entries, extractedReceipts);

  return (
    <main className="mx-auto grid w-[min(1240px,calc(100vw-32px))] gap-6 px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1240px)] max-[900px]:pt-5">
      <GroceriesDashboard
        activeBoard={selection.activeBoard}
        payload={payload}
        boards={selection.boards}
        currentMonth={currentMonth}
        members={members}
        monthOptions={buildMonthOptions(month, 12, resolvedLocale)}
      />
    </main>
  );
};

export default GroceriesPage;
