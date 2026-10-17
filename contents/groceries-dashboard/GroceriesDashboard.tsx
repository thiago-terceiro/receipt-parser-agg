"use client";

import { CalendarDays, Package2, ReceiptText, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocale, useTranslations } from "@/components/locale-utils";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import type { BoardMemberSummary, BoardSummary } from "@/lib/boards";
import { createCurrencyFormatter } from "@/lib/currency";
import {
  buildMonthOptions,
  shiftMonthKey,
  type GroceriesMonthPayload,
  type GroceryCategorySummary,
  type MonthOption,
} from "@/lib/groceries";
import { formatCategoryLabel } from "@/lib/receipt";

import { GroceriesDashboardBoardsPanel } from "./GroceriesDashboardBoardsPanel";
import { GroceriesDashboardCategoriesSection } from "./GroceriesDashboardCategoriesSection";
import { GroceriesDashboardEmptyState } from "./GroceriesDashboardEmptyState";
import { GroceriesDashboardRecentReceiptsSection } from "./GroceriesDashboardRecentReceiptsSection";
import { GroceriesDashboardSummarySection } from "./GroceriesDashboardSummarySection";

type GroceriesDashboardSnapshot = {
  activeBoard: BoardSummary;
  payload: GroceriesMonthPayload;
  currentMonth: string;
  members: BoardMemberSummary[];
  monthOptions: MonthOption[];
};

type BoardSwitchState = {
  sourceBoardId: string;
  sourceMonth: string;
  snapshot: GroceriesDashboardSnapshot | null;
};

const GROCERIES_DASHBOARD_CACHE_KEY_PREFIX = "receipt-ai-groceries-dashboard";

const buildGroceriesDashboardCacheKey = (
  locale: string,
  boardId: string,
  month: string,
) => `${GROCERIES_DASHBOARD_CACHE_KEY_PREFIX}:${locale}:${boardId}:${month}`;

const readGroceriesDashboardSnapshot = (
  locale: string,
  boardId: string,
  month: string,
) => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSnapshot = window.localStorage.getItem(
      buildGroceriesDashboardCacheKey(locale, boardId, month),
    );

    return rawSnapshot
      ? (JSON.parse(rawSnapshot) as GroceriesDashboardSnapshot)
      : null;
  } catch {
    return null;
  }
};

const writeGroceriesDashboardSnapshot = (
  locale: string,
  snapshot: GroceriesDashboardSnapshot,
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      buildGroceriesDashboardCacheKey(
        locale,
        snapshot.activeBoard.id,
        snapshot.payload.month,
      ),
      JSON.stringify(snapshot),
    );
  } catch {
    // Ignore storage failures and fall back to server navigation.
  }
};

export const GroceriesDashboard = ({
  activeBoard,
  boards,
  payload,
  currentMonth,
  members,
  monthOptions: _monthOptions,
}: {
  activeBoard: BoardSummary;
  boards: BoardSummary[];
  payload: GroceriesMonthPayload;
  currentMonth: string;
  members: BoardMemberSummary[];
  monthOptions: MonthOption[];
}) => {
  const locale = useLocale();
  const translations = useTranslations();
  const router = useRouter();
  const [boardSwitchState, setBoardSwitchState] =
    useState<BoardSwitchState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    payload.categories[0]?.category ?? null,
  );
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [monthOverride, setMonthOverride] = useState<{
    boardId: string;
    month: string;
    payload: GroceriesMonthPayload;
  } | null>(null);
  const monthCacheRef = useRef<Map<string, GroceriesMonthPayload>>(new Map());

  const activePayload =
    monthOverride &&
    monthOverride.boardId === activeBoard.id &&
    monthOverride.month !== payload.month
      ? monthOverride.payload
      : payload;

  useEffect(() => {
    monthCacheRef.current.set(`${activeBoard.id}:${payload.month}`, payload);
  }, [activeBoard.id, payload]);

  const displayedMonthOptions = useMemo(
    () => buildMonthOptions(activePayload.month, 12, locale),
    [activePayload.month, locale],
  );

  const serverSnapshot = useMemo(
    () => ({
      activeBoard,
      payload: activePayload,
      currentMonth,
      members,
      monthOptions: displayedMonthOptions,
    }),
    [activeBoard, activePayload, currentMonth, displayedMonthOptions, members],
  );
  const isBoardSwitchTransitioning =
    boardSwitchState?.sourceBoardId === activeBoard.id &&
    boardSwitchState.sourceMonth === payload.month;
  const displayedSnapshot =
    isBoardSwitchTransitioning && boardSwitchState.snapshot
      ? boardSwitchState.snapshot
      : serverSnapshot;
  const displayedActiveBoard =
    isBoardSwitchTransitioning && boardSwitchState?.snapshot
      ? boards.find(
        (board) => board.id === boardSwitchState.snapshot?.activeBoard.id,
      ) ?? boardSwitchState.snapshot.activeBoard
      : activeBoard;
  const displayedPayload = displayedSnapshot.payload;
  const displayedMembers = displayedSnapshot.members;
  const isBoardSwitchPending = Boolean(
    isBoardSwitchTransitioning && !boardSwitchState?.snapshot,
  );

  const prefetchMonth = useCallback(async (boardId: string, month: string) => {
    const key = `${boardId}:${month}`;
    if (monthCacheRef.current.has(key)) return;
    try {
      const res = await fetch(
        `/api/expenses?boardId=${encodeURIComponent(boardId)}&month=${encodeURIComponent(month)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as GroceriesMonthPayload;
        monthCacheRef.current.set(key, data);
      }
    } catch {
      // background prefetch best effort
    }
  }, []);

  useEffect(() => {
    const prev = shiftMonthKey(activePayload.month, -1);
    const next = shiftMonthKey(activePayload.month, 1);
    void prefetchMonth(displayedActiveBoard.id, prev);
    if (next <= currentMonth) {
      void prefetchMonth(displayedActiveBoard.id, next);
    }
  }, [currentMonth, displayedActiveBoard.id, activePayload.month, prefetchMonth]);

  useEffect(() => {
    writeGroceriesDashboardSnapshot(locale, serverSnapshot);
  }, [locale, serverSnapshot]);

  const currencyFormatter = useMemo(
    () => createCurrencyFormatter(locale, displayedPayload.currencyCode),
    [displayedPayload.currencyCode, locale],
  );
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 0,
      }),
    [locale],
  );
  const integerFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
      }),
    [locale],
  );
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const activeCategory = useMemo(() => {
    if (displayedPayload.categories.length === 0) {
      return null;
    }

    if (
      selectedCategory &&
      displayedPayload.categories.some(
        (category) => category.category === selectedCategory,
      )
    ) {
      return selectedCategory;
    }

    return displayedPayload.categories[0].category;
  }, [displayedPayload.categories, selectedCategory]);

  const active = useMemo(
    () =>
      displayedPayload.categories.find(
        (category) => category.category === activeCategory,
      ) ?? null,
    [activeCategory, displayedPayload.categories],
  );
  const activeCategoryLabel = useMemo(
    () =>
      active
        ? formatCategoryLabel(active.category, translations.categories)
        : null,
    [active, translations.categories],
  );

  const statCards = useMemo(
    () => [
      {
        label: translations.groceries.stats.monthTotal,
        value: currencyFormatter.format(displayedPayload.summary.total),
        icon: ReceiptText,
      },
      {
        label: translations.groceries.stats.uniqueItemsTracked,
        value: integerFormatter.format(displayedPayload.summary.uniqueItemCount),
        icon: Package2,
      },
      {
        label: translations.groceries.stats.itemsTracked,
        value: integerFormatter.format(displayedPayload.summary.itemCount),
        icon: Package2,
      },
      {
        label: translations.groceries.stats.receiptsSaved,
        value: integerFormatter.format(displayedPayload.summary.receiptCount),
        icon: ReceiptText,
      },
      {
        label: translations.groceries.stats.categoriesActive,
        value: integerFormatter.format(displayedPayload.summary.categoryCount),
        icon: CalendarDays,
      },
    ],
    [
      currencyFormatter,
      displayedPayload.summary.categoryCount,
      displayedPayload.summary.itemCount,
      displayedPayload.summary.receiptCount,
      displayedPayload.summary.total,
      displayedPayload.summary.uniqueItemCount,
      integerFormatter,
      translations.groceries.stats.categoriesActive,
      translations.groceries.stats.itemsTracked,
      translations.groceries.stats.monthTotal,
      translations.groceries.stats.receiptsSaved,
      translations.groceries.stats.uniqueItemsTracked,
    ],
  );
  const recentExtractedReceipts = useMemo(
    () => displayedPayload.extractedReceipts.slice(0, 6),
    [displayedPayload.extractedReceipts],
  );

  const handleBoardActivated = useCallback(
    (boardId: string) => {
      const targetMonth = payload.month;
      const cachedSnapshot = readGroceriesDashboardSnapshot(
        locale,
        boardId,
        targetMonth,
      );

      setBoardSwitchState({
        sourceBoardId: activeBoard.id,
        sourceMonth: payload.month,
        snapshot: cachedSnapshot,
      });

      router.push({
        pathname: "/groceries",
        query: {
          board: boardId,
          ...(targetMonth !== currentMonth ? { month: targetMonth } : {}),
        },
      });
    },
    [activeBoard.id, currentMonth, locale, payload.month, router],
  );

  const handleSelectCategory = useCallback(
    (category: GroceryCategorySummary) => {
      setSelectedCategory(category.category);
      if (
        typeof window !== "undefined" &&
        (window.innerWidth < 1024 ||
          (window.matchMedia &&
            window.matchMedia("(max-width: 1023px)").matches))
      ) {
        setIsMobileDetailOpen(true);
      }
    },
    [],
  );

  const handleMonthChange = useCallback(
    async (targetMonth: string) => {
      if (targetMonth === activePayload.month) {
        return;
      }

      const boardId = displayedActiveBoard.id;
      const cacheKey = `${boardId}:${targetMonth}`;
      const cached = monthCacheRef.current.get(cacheKey);

      // Silently update URL without triggering full Next.js App Router RSC unmount
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (targetMonth === currentMonth) {
          url.searchParams.delete("month");
        } else {
          url.searchParams.set("month", targetMonth);
        }
        window.history.replaceState(null, "", url.toString());
      }

      if (cached) {
        setMonthOverride({ boardId, month: targetMonth, payload: cached });
        return;
      }

      try {
        const response = await fetch(
          `/api/expenses?boardId=${encodeURIComponent(boardId)}&month=${encodeURIComponent(targetMonth)}`,
        );
        if (response.ok) {
          const newPayload = (await response.json()) as GroceriesMonthPayload;
          monthCacheRef.current.set(cacheKey, newPayload);
          setMonthOverride({ boardId, month: targetMonth, payload: newPayload });
        } else {
          router.push({
            pathname: "/groceries",
            query: {
              board: boardId,
              ...(targetMonth !== currentMonth ? { month: targetMonth } : {}),
            },
          });
        }
      } catch {
        router.push({
          pathname: "/groceries",
          query: {
            board: boardId,
            ...(targetMonth !== currentMonth ? { month: targetMonth } : {}),
          },
        });
      }
    },
    [activePayload.month, currentMonth, displayedActiveBoard.id, router],
  );

  return (
    <div className="grid gap-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 rounded-full border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.78rem] font-semibold text-muted-foreground hover:bg-[var(--surface-plain-soft)]"
        >
          <Link href="/" locale={locale} prefetch={true}>
            <Undo2 className="size-4" />
            <span>{translations.groceries.backToHome}</span>
          </Link>
        </Button>
      </div>

      <GroceriesDashboardBoardsPanel
        activeBoard={displayedActiveBoard}
        boards={boards}
        members={displayedMembers}
        translations={translations}
        isBoardSwitchPending={isBoardSwitchPending}
        onBoardActivated={handleBoardActivated}
      />

      <GroceriesDashboardSummarySection
        boardId={displayedActiveBoard.id}
        payload={displayedPayload}
        currentMonth={currentMonth}
        monthOptions={displayedMonthOptions}
        locale={locale}
        statCards={statCards}
        translations={translations}
        onMonthChange={handleMonthChange}
      />

      <GroceriesDashboardRecentReceiptsSection
        boardId={displayedActiveBoard.id}
        receipts={recentExtractedReceipts}
        translations={translations}
        currencyFormatter={currencyFormatter}
        dateTimeFormatter={dateTimeFormatter}
      />

      {displayedPayload.categories.length === 0 ? (
        <GroceriesDashboardEmptyState
          month={displayedPayload.month}
          locale={locale}
          translations={translations}
        />
      ) : (
        <GroceriesDashboardCategoriesSection
          categories={displayedPayload.categories}
          activeCategory={activeCategory}
          active={active}
          activeCategoryLabel={activeCategoryLabel}
          isMobileDetailOpen={isMobileDetailOpen}
          translations={translations}
          currencyFormatter={currencyFormatter}
          percentFormatter={percentFormatter}
          onSelectCategory={handleSelectCategory}
          onMobileDialogOpenChange={setIsMobileDetailOpen}
        />
      )}
    </div>
  );
};