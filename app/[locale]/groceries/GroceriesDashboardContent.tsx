import { GroceriesDashboard } from "@/contents/groceries-dashboard/GroceriesDashboard";
import { redirect } from "@/i18n/navigation";
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
  eyebrow,
}: {
  eyebrow: string;
}) => {
  return (
    <div
      className="grid gap-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={eyebrow}
    >
      <div
        aria-hidden="true"
        className="h-[132px] animate-pulse rounded-[30px] border border-[var(--border)] bg-[var(--surface-plain)]/90 p-6 max-[760px]:h-[210px]"
      />

      <section
        aria-hidden="true"
        className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-soft)]/90 p-7 shadow-[var(--shadow)]"
      >
        <div className="grid gap-3">
          <div className="h-10 w-64 max-w-full animate-pulse rounded-xl bg-[var(--surface-plain-soft)]" />
        </div>

        <div className="mt-6 h-[92px] animate-pulse rounded-[26px] border border-[var(--border)] bg-[var(--surface-plain-soft)]/70" />

        <div className="mt-6 grid grid-cols-5 gap-4 max-[1200px]:grid-cols-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
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
        showBackToHome={false}
        showHeroIntro={false}
      />
    </div>
  );
};
