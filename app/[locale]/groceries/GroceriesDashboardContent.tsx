import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GroceriesDashboard } from "@/contents/groceries-dashboard/GroceriesDashboard";
import { Link, redirect } from "@/i18n/navigation";
import { BoardRouteError, requireBoardIdentity } from "@/lib/boards-server";
import {
  buildGroceriesMonthPayload,
  buildMonthOptions,
} from "@/lib/groceries";
import { loadGroceriesDashboardData } from "@/lib/groceries-server";
import type { AppLocale } from "@/lib/i18n/config";

const shouldRecoverFromRequestedBoardError = (
  requestedBoardId: string | undefined,
  error: unknown,
) => {
  return Boolean(
    requestedBoardId &&
      error instanceof BoardRouteError &&
      [400, 403, 404].includes(error.statusCode),
  );
};

export const GroceriesDashboardSkeleton = ({
  backToHomeLabel,
  eyebrow,
  heroDescription,
  locale,
}: {
  backToHomeLabel: string;
  eyebrow: string;
  heroDescription: string;
  locale: AppLocale;
}) => {
  return (
    <div
      className="grid gap-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={eyebrow}
    >
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 rounded-full border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.78rem] font-semibold text-muted-foreground"
        >
          <Link href="/" locale={locale}>
            <Undo2 className="size-4" aria-hidden="true" />
            <span>{backToHomeLabel}</span>
          </Link>
        </Button>
      </div>

      <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-soft)]/90 p-7 shadow-[var(--shadow)]">
        <div className="grid gap-3">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
            {eyebrow}
          </p>
          <div className="h-9 w-64 max-w-full animate-pulse rounded-xl bg-[var(--surface-plain-soft)]" />
          <p className="m-0 max-w-[65ch] text-sm text-muted-foreground">
            {heroDescription}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="mt-6 grid grid-cols-5 gap-4 max-[1200px]:grid-cols-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-[118px] animate-pulse rounded-[24px] border border-[var(--border)] bg-[var(--surface-plain-soft)]/90 p-5"
            />
          ))}
        </div>
      </section>

      <div
        aria-hidden="true"
        className="h-[220px] animate-pulse rounded-[32px] border border-[var(--border)] bg-[var(--surface-soft)]/80"
      />
    </div>
  );
};

export const GroceriesDashboardContent = async ({
  locale,
  month,
  currentMonth,
  requestedBoardId,
}: {
  locale: AppLocale;
  month: string;
  currentMonth: string;
  requestedBoardId?: string;
}) => {
  const boardIdentity = await requireBoardIdentity();
  let selection;
  let entries;
  let extractedReceipts;
  let members;

  try {
    ({ selection, entries, extractedReceipts, members } =
      await loadGroceriesDashboardData(
        boardIdentity,
        month,
        requestedBoardId,
      ));
  } catch (error) {
    if (shouldRecoverFromRequestedBoardError(requestedBoardId, error)) {
      redirect({
        href:
          month === currentMonth
            ? "/groceries"
            : {
                pathname: "/groceries",
                query: { month },
              },
        locale,
      });
    }

    throw error;
  }

  const payload = buildGroceriesMonthPayload(
    month,
    entries,
    extractedReceipts,
  );

  return (
    <div className="grid gap-6">
      <GroceriesDashboard
        activeBoard={selection.activeBoard}
        payload={payload}
        boards={selection.boards}
        currentMonth={currentMonth}
        members={members}
        monthOptions={buildMonthOptions(month, 12, locale)}
      />
    </div>
  );
};
