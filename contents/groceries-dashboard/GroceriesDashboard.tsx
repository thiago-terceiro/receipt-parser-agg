"use client";

import { CalendarDays, Package2, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useLocale, useTranslations } from "@/components/locale-utils";
import {
  type GroceriesMonthPayload,
  type GroceryCategorySummary,
  type MonthOption,
} from "@/lib/groceries";
import { localizePath } from "@/lib/i18n/config";
import { formatCategoryLabel } from "@/lib/receipt";

import { GroceriesDashboardCategoriesSection } from "./GroceriesDashboardCategoriesSection";
import { GroceriesDashboardEmptyState } from "./GroceriesDashboardEmptyState";
import { GroceriesDashboardRecentReceiptsSection } from "./GroceriesDashboardRecentReceiptsSection";
import { GroceriesDashboardSummarySection } from "./GroceriesDashboardSummarySection";

export const GroceriesDashboard = ({
  payload,
  currentMonth,
  monthOptions,
}: {
  payload: GroceriesMonthPayload;
  currentMonth: string;
  monthOptions: MonthOption[];
}) => {
  const locale = useLocale();
  const translations = useTranslations();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    payload.categories[0]?.category ?? null,
  );
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const groceriesPath = localizePath("/groceries", locale);
  const homePath = localizePath("/", locale);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
      }),
    [locale],
  );
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
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
        value: String(payload.summary.uniqueItemCount),
        icon: Package2,
      },
      {
        label: translations.groceries.stats.itemsTracked,
        value: String(payload.summary.itemCount),
        icon: Package2,
      },
      {
        label: translations.groceries.stats.receiptsSaved,
        value: String(payload.summary.receiptCount),
        icon: ReceiptText,
      },
      {
        label: translations.groceries.stats.categoriesActive,
        value: String(payload.summary.categoryCount),
        icon: CalendarDays,
      },
    ],
    [
      currencyFormatter,
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
        month === currentMonth
          ? groceriesPath
          : `${groceriesPath}?month=${month}`,
      );
    },
    [currentMonth, groceriesPath, router],
  );

  return (
    <div className="grid gap-6">
      <GroceriesDashboardSummarySection
        payload={payload}
        currentMonth={currentMonth}
        monthOptions={monthOptions}
        locale={locale}
        groceriesPath={groceriesPath}
        homePath={homePath}
        statCards={statCards}
        translations={translations}
        onMonthChange={handleMonthChange}
      />

      <GroceriesDashboardRecentReceiptsSection
        receipts={recentExtractedReceipts}
        translations={translations}
        currencyFormatter={currencyFormatter}
        dateTimeFormatter={dateTimeFormatter}
      />

      {payload.categories.length === 0 ? (
        <GroceriesDashboardEmptyState
          homePath={homePath}
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