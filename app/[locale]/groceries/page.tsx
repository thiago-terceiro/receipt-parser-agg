import { getServerSession } from "next-auth";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";

import { authOptions } from "@/auth";
import { GroceriesDashboard } from "@/components/groceries/groceries-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    buildGroceriesMonthPayload,
    buildMonthOptions,
    getGroceriesStorageKeyByUserId,
    getLegacyGroceriesStorageKeyByEmail,
    getLegacyReceiptExtractionStorageKeyByEmail,
    getMonthKey,
    getReceiptExtractionStorageKeyByUserId,
    isValidMonthKey,
    type ExtractedReceipt,
    type GroceryEntry,
} from "@/lib/groceries";
import {
    getLocaleFromSegment,
    localizePath,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { redis } from "@/lib/redis";

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
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const userId = (session?.user as { id?: string } | undefined)?.id?.trim();

  if (!userId && !email) {
    return (
      <main className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-6 px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1180px)] max-[900px]:pt-5">
        <Card className="rounded-[30px] border-[var(--border)] bg-[var(--surface-soft)] py-0 shadow-[var(--shadow)]">
          <CardContent className="grid min-h-[320px] place-items-center gap-4 p-8 text-center">
            <div className="grid gap-3 place-items-center">
              <h1 className="m-0 text-[2.4rem] tracking-[-0.05em]">
                {translations.groceries.signInTitle}
              </h1>
              <p className="m-0 max-w-[52ch] text-muted-foreground">
                {translations.groceries.signInDescription}
              </p>
              <div>
                <Button asChild>
                  <Link href={localizePath("/", resolvedLocale)}>
                    {translations.groceries.backToHome}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const currentMonth = getMonthKey(new Date());
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedMonth = resolvedSearchParams?.month;
  const month =
    typeof requestedMonth === "string" && isValidMonthKey(requestedMonth) && requestedMonth <= currentMonth
      ? requestedMonth
      : currentMonth;

  const keysToTry = [
    userId ? getGroceriesStorageKeyByUserId(userId, month) : null,
    email ? getLegacyGroceriesStorageKeyByEmail(email, month) : null,
  ].filter((value): value is string => Boolean(value));

  let entries: GroceryEntry[] = [];
  for (const key of keysToTry) {
    const items = await redis.lrange(key, 0, -1);
    if (items.length === 0) {
      continue;
    }

    entries = items.map((item) => JSON.parse(item as string) as GroceryEntry);
    break;
  }

  const extractionKeysToTry = [
    userId ? getReceiptExtractionStorageKeyByUserId(userId, month) : null,
    email ? getLegacyReceiptExtractionStorageKeyByEmail(email, month) : null,
  ].filter((value): value is string => Boolean(value));

  let extractedReceipts: ExtractedReceipt[] = [];
  for (const key of extractionKeysToTry) {
    const items = await redis.lrange(key, 0, -1);
    if (items.length === 0) {
      continue;
    }

    extractedReceipts = items.map((item) => JSON.parse(item as string) as ExtractedReceipt);
    break;
  }

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
