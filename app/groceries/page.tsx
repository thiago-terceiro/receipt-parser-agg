import { getServerSession } from "next-auth";
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
    getMonthKey,
    isValidMonthKey,
    type GroceryEntry,
} from "@/lib/groceries";
import { redis } from "@/lib/redis";

type GroceriesPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

const GroceriesPage = async ({ searchParams }: GroceriesPageProps) => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const userId = (session?.user as { id?: string } | undefined)?.id?.trim();

  if (!userId && !email) {
    return (
      <main className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-6 px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1180px)] max-[900px]:pt-5">
        <Card className="rounded-[30px] border-[var(--border)] bg-[rgba(255,250,243,0.86)] py-0 shadow-[var(--shadow)]">
          <CardContent className="grid min-h-[320px] place-items-center gap-4 p-8 text-center">
            <div className="grid gap-3 place-items-center">
              <h1 className="m-0 text-[2.4rem] tracking-[-0.05em]">Sign in to unlock your groceries dashboard</h1>
              <p className="m-0 max-w-[52ch] text-muted-foreground">
                This page reads user-scoped grocery history, so it only opens once a Google session is active.
              </p>
              <div>
                <Button asChild>
                  <Link href="/">Back to home</Link>
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

  const payload = buildGroceriesMonthPayload(month, entries);

  return (
    <main className="mx-auto grid w-[min(1240px,calc(100vw-32px))] gap-6 px-0 py-10 pb-16 max-[900px]:w-[min(calc(100vw-20px),1240px)] max-[900px]:pt-5">
      <GroceriesDashboard
        payload={payload}
        currentMonth={currentMonth}
        monthOptions={buildMonthOptions(month)}
      />
    </main>
  );
};

export default GroceriesPage;