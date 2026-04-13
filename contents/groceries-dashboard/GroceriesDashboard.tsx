"use client";

import { CalendarDays, Package2, ReceiptText } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useLocale, useTranslations } from "@/components/locale-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatMonthLabel,
  shiftMonthKey,
  type GroceriesMonthPayload,
  type GroceryCategorySummary,
  type MonthOption,
} from "@/lib/groceries";
import { localizePath } from "@/lib/i18n/config";
import { formatCategoryLabel } from "@/lib/receipt";

import {
  CategorySummaryCard,
  EmptyStateCard,
  MemoizedCategoryDetails,
  RecentExtractedReceiptsSection,
  StatsGrid,
} from "./GroceriesDashboardParts";

const getMonthProgress = (month: string) => {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const today = new Date();
  const totalDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const isCurrentMonth =
    today.getUTCFullYear() === year && today.getUTCMonth() === monthIndex;
  const currentDay = isCurrentMonth ? today.getUTCDate() : totalDays;
  const progress = totalDays > 0 ? currentDay / totalDays : 0;

  return {
    totalDays,
    currentDay,
    progress: Math.min(Math.max(progress, 0), 1),
  };
};

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

  const progress = useMemo(
    () => getMonthProgress(payload.month),
    [payload.month],
  );
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
  const isCurrentMonth = payload.month === currentMonth;
  const previousMonth = shiftMonthKey(payload.month, -1);
  const nextMonth = shiftMonthKey(payload.month, 1);
  const nextMonthDisabled = nextMonth > currentMonth;

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
      <section className="grid gap-5 rounded-[30px] border border-[var(--border)] bg-[var(--surface-soft)] p-6 shadow-[var(--shadow)] backdrop-blur-[16px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--accent-dark)]">
              <span>{translations.groceries.eyebrow}</span>
              <span className="text-[var(--muted-foreground)]">
                {isCurrentMonth
                  ? translations.groceries.currentMonthView
                  : translations.groceries.historicalMonthView}
              </span>
            </div>
            <div>
              <h1 className="m-0 text-[clamp(2.6rem,6vw,5rem)] leading-[0.92] tracking-[-0.05em] text-balance">
                {formatMonthLabel(payload.month, locale)}
              </h1>
              <p className="m-0 mt-3 max-w-[62ch] text-[1rem] leading-7 text-muted-foreground">
                {translations.groceries.heroDescription}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 max-[700px]:w-full">
            <Button
              asChild
              variant="secondary"
              className="border-[var(--border)] bg-[var(--surface-plain)]"
            >
              <Link
                href={
                  previousMonth === currentMonth
                    ? groceriesPath
                    : `${groceriesPath}?month=${previousMonth}`
                }
              >
                {translations.groceries.previousMonth}
              </Link>
            </Button>
            <Select value={payload.month} onValueChange={handleMonthChange}>
              <SelectTrigger className="min-w-[210px] rounded-full border-[var(--border)] bg-[var(--surface-plain)]">
                <SelectValue placeholder={translations.groceries.selectMonth} />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {nextMonthDisabled ? (
              <Button
                variant="secondary"
                className="border-[var(--border)] bg-[var(--surface-plain-soft)]"
                disabled
              >
                {translations.groceries.nextMonth}
              </Button>
            ) : (
              <Button
                asChild
                variant="secondary"
                className="border-[var(--border)] bg-[var(--surface-plain)]"
              >
                <Link
                  href={
                    nextMonth === currentMonth
                      ? groceriesPath
                      : `${groceriesPath}?month=${nextMonth}`
                  }
                >
                  {translations.groceries.nextMonth}
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="secondary"
              className="border-[var(--border)] bg-[var(--surface-plain)] max-[700px]:ml-auto"
            >
              <Link href={homePath}>{translations.groceries.backToUpload}</Link>
            </Button>
          </div>
        </div>

        <div
          className="grid gap-4 rounded-[24px] border border-[var(--border)] p-5"
          style={{ background: "var(--progress-surface)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="size-4 text-[var(--accent-dark)]" />
              <span>{translations.groceries.monthProgress}</span>
            </div>
            <p className="m-0 text-sm text-muted-foreground">
              {translations.groceries.dayOf(
                progress.currentDay,
                progress.totalDays,
              )}
            </p>
          </div>

          <div className="grid gap-2">
            <div className="relative h-4 overflow-hidden rounded-full bg-[var(--progress-track)]">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress * 100}%` }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{ backgroundImage: "var(--accent-gradient)" }}
              />
              <div
                className="absolute top-1/2 z-10 size-6 -translate-y-1/2 rounded-full border-2 border-[var(--surface-plain)] bg-[var(--accent-dark)] shadow-[0_12px_24px_rgba(84,52,29,0.25)]"
                style={{ left: `calc(${progress.progress * 100}% - 12px)` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span>{Math.ceil(progress.totalDays / 2)}</span>
              <span>{progress.totalDays}</span>
            </div>
          </div>
        </div>

        <StatsGrid stats={statCards} />
      </section>

      <RecentExtractedReceiptsSection
        receipts={recentExtractedReceipts}
        translations={translations}
        currencyFormatter={currencyFormatter}
        dateTimeFormatter={dateTimeFormatter}
      />

      {payload.categories.length === 0 ? (
        <EmptyStateCard
          homePath={homePath}
          month={payload.month}
          locale={locale}
          translations={translations}
        />
      ) : (
        <LayoutGroup>
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
            <motion.div
              layout
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 h-fit"
            >
              {payload.categories.map((category) => (
                <CategorySummaryCard
                  key={category.category}
                  category={category}
                  isActive={activeCategory === category.category}
                  translations={translations}
                  currencyFormatter={currencyFormatter}
                  percentFormatter={percentFormatter}
                  onSelect={handleSelectCategory}
                />
              ))}
            </motion.div>

            <div className="hidden lg:block">
              <AnimatePresence mode="wait" initial={false}>
                {active ? (
                  <motion.div
                    key={active.category}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="sticky top-6"
                  >
                    <Card className="rounded-[30px] border-[rgba(181,82,51,0.2)] bg-[var(--surface-strong)] py-0 shadow-[var(--shadow)]">
                      <CardContent className="p-6">
                        <MemoizedCategoryDetails
                          category={active}
                          categoryLabel={activeCategoryLabel ?? ""}
                          translations={translations}
                          currencyFormatter={currencyFormatter}
                          percentFormatter={percentFormatter}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </section>
        </LayoutGroup>
      )}

      <Dialog open={isMobileDetailOpen} onOpenChange={setIsMobileDetailOpen}>
        <DialogContent className="lg:hidden">
          {active ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formatCategoryLabel(active.category, translations.categories)}
                </DialogTitle>
                <DialogDescription>
                  {translations.groceries.mobileDescription}
                </DialogDescription>
              </DialogHeader>
              <MemoizedCategoryDetails
                category={active}
                categoryLabel={activeCategoryLabel ?? ""}
                translations={translations}
                currencyFormatter={currencyFormatter}
                percentFormatter={percentFormatter}
                className="mt-4"
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};