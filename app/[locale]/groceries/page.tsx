import { setRequestLocale } from "next-intl/server";

import { GroceriesDashboard } from "@/contents/groceries-dashboard/GroceriesDashboard";
import {
  buildGroceriesMonthPayload,
  buildMonthOptions,
  getMonthKey,
  resolveRequestedMonth,
} from "@/lib/groceries";
import { loadGroceriesMonthData } from "@/lib/groceries-server";
import { getLocaleFromSegment } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getSessionIdentity } from "@/lib/session";

import { GroceriesSignInCard } from "./GroceriesSignInCard";

type GroceriesPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    month?: string;
  }>;
};

const GroceriesPage = async ({ params, searchParams }: GroceriesPageProps) => {
  const { locale } = await params;
  const resolvedLocale = getLocaleFromSegment(locale);
  setRequestLocale(resolvedLocale);
  const translations = await getMessages(resolvedLocale);
  const identity = await getSessionIdentity();

  if (!identity) {
    return (
      <GroceriesSignInCard
        locale={resolvedLocale}
        translations={translations.groceries}
      />
    );
  }

  const currentMonth = getMonthKey(new Date());
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const month = resolveRequestedMonth(resolvedSearchParams?.month, currentMonth);
  const { entries, extractedReceipts } = await loadGroceriesMonthData(
    identity,
    month,
  );

  const payload = buildGroceriesMonthPayload(month, entries, extractedReceipts);

  return (
    <main className="mx-auto grid w-[min(1240px,calc(100vw-32px))] gap-6 px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1240px)] max-[900px]:pt-5">
      <GroceriesDashboard
        payload={payload}
        currentMonth={currentMonth}
        monthOptions={buildMonthOptions(month, 12, resolvedLocale)}
      />
    </main>
  );
};

export default GroceriesPage;
