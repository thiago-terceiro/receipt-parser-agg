"use client";

import { CalendarDays, Package2, ReceiptText, Undo2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useLocale, useTranslations } from "@/components/locale-utils";
import { Button } from "@/components/ui/button";
import { Link, getPathname, useRouter } from "@/i18n/navigation";
import type { BoardMemberSummary, BoardSummary } from "@/lib/boards";
import { createCurrencyFormatter } from "@/lib/currency";
import {
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

export const GroceriesDashboard = ({
  activeBoard,
  boards,
  payload,
  currentMonth,
  members,
  monthOptions,
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    payload.categories[0]?.category ?? null,
  );
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const currencyFormatter = useMemo(
    () => createCurrencyFormatter(locale, payload.currencyCode),
    [locale, payload.currencyCode],
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
    if (payload.categories.length === 0) {
      return null;
    }

    if (
      selectedCategory &&
      payload.categories.some(
        (category) => category.category === selectedCategory,
      )
    ) {
      return selectedCategory;
    }

    return payload.categories[0].category;
  }, [payload.categories, selectedCategory]);

  const active = useMemo(
    () =>
      payload.categories.find(
        (category) => category.category === activeCategory,
      ) ?? null,
    [activeCategory, payload.categories],
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
        value: currencyFormatter.format(payload.summary.total),
        icon: ReceiptText,
      },
      {
        label: translations.groceries.stats.uniqueItemsTracked,
        value: integerFormatter.format(payload.summary.uniqueItemCount),
        icon: Package2,
      },
      {
        label: translations.groceries.stats.itemsTracked,
        value: integerFormatter.format(payload.summary.itemCount),
        icon: Package2,
      },
      {
        label: translations.groceries.stats.receiptsSaved,
        value: integerFormatter.format(payload.summary.receiptCount),
        icon: ReceiptText,
      },
      {
        label: translations.groceries.stats.categoriesActive,
        value: integerFormatter.format(payload.summary.categoryCount),
        icon: CalendarDays,
      },
    ],
    [
      currencyFormatter,
      integerFormatter,
      payload.summary.categoryCount,
      payload.summary.itemCount,
      payload.summary.uniqueItemCount,
      payload.summary.receiptCount,
      payload.summary.total,
      translations.groceries.stats.categoriesActive,
      translations.groceries.stats.itemsTracked,
      translations.groceries.stats.monthTotal,
      translations.groceries.stats.receiptsSaved,
      translations.groceries.stats.uniqueItemsTracked,
    ],
  );
  const recentExtractedReceipts = useMemo(
    () => payload.extractedReceipts.slice(0, 6),
    [payload.extractedReceipts],
  );

  const handleSelectCategory = useCallback(
    (category: GroceryCategorySummary) => {
      setSelectedCategory(category.category);
      if (typeof window !== "undefined" && window.innerWidth < 900) {
        setIsMobileDetailOpen(true);
      }
    },
    [],
  );

  const handleMonthChange = useCallback(
    (month: string) => {
      router.push(
        getPathname({
          locale,
          href: {
            pathname: "/groceries",
            query: {
              board: activeBoard.id,
              ...(month !== currentMonth ? { month } : {}),
            },
          },
        }),
      );
    },
    [activeBoard.id, currentMonth, locale, router],
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
          <Link href="/" locale={locale}>
            <Undo2 className="size-4" />
            <span>{translations.groceries.backToHome}</span>
          </Link>
        </Button>
      </div>

      <GroceriesDashboardBoardsPanel
        activeBoard={activeBoard}
        boards={boards}
        currentMonth={currentMonth}
        locale={locale}
        members={members}
        selectedMonth={payload.month}
        translations={translations}
      />

      <GroceriesDashboardSummarySection
        boardId={activeBoard.id}
        payload={payload}
        currentMonth={currentMonth}
        monthOptions={monthOptions}
        locale={locale}
        statCards={statCards}
        translations={translations}
        onMonthChange={handleMonthChange}
      />

      <GroceriesDashboardRecentReceiptsSection
        boardId={activeBoard.id}
        receipts={recentExtractedReceipts}
        translations={translations}
        currencyFormatter={currencyFormatter}
        dateTimeFormatter={dateTimeFormatter}
      />

      {payload.categories.length === 0 ? (
        <GroceriesDashboardEmptyState
          month={payload.month}
          locale={locale}
          translations={translations}
        />
      ) : (
        <GroceriesDashboardCategoriesSection
          categories={payload.categories}
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