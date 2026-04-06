"use client";

import {
  CalendarDays,
  ChevronRight,
  Package2,
  ReceiptText,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";

import { useLocale, useTranslations } from "@/components/locale-utils";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

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

type CategoryDetailsProps = {
  category: GroceryCategorySummary;
  categoryLabel: string;
  translations: ReturnType<typeof useTranslations>;
  currencyFormatter: Intl.NumberFormat;
  percentFormatter: Intl.NumberFormat;
  className?: string;
};

const CategoryDetails = ({
  category,
  categoryLabel,
  translations,
  currencyFormatter,
  percentFormatter,
  className,
}: CategoryDetailsProps) => {
  return (
    <div className={cn("grid gap-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--accent-dark)]">
            {categoryLabel}
          </p>
          <h3 className="m-0 mt-1 text-[1.9rem] leading-none tracking-[-0.04em]">
            {currencyFormatter.format(category.total)}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge
            variant="outline"
            className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1"
          >
            {translations.groceries.units(category.itemCount)}
          </Badge>
          <Badge
            variant="outline"
            className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1"
          >
            {translations.groceries.uniqueItems(category.uniqueItemCount)}
          </Badge>
          <Badge
            variant="outline"
            className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1"
          >
            {percentFormatter.format(category.share)}{" "}
            {translations.groceries.ofMonth}
          </Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface-plain-soft)]">
        <div className="grid grid-cols-[minmax(0,1.4fr)_120px_120px_120px] gap-4 border-b border-[var(--border)] px-5 py-3 text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-dark)] max-[740px]:hidden">
          <span>{translations.groceries.table.item}</span>
          <span className="text-right">
            {translations.groceries.table.unitPrice}
          </span>
          <span className="text-right">
            {translations.groceries.table.amount}
          </span>
          <span className="text-right">
            {translations.groceries.table.total}
          </span>
        </div>

        <div className="grid gap-0">
          {category.groups.map((group) => (
            <div
              key={group.normalizedItem}
              className="grid grid-cols-[minmax(0,1.4fr)_120px_120px_120px] gap-4 border-b border-[var(--border)] px-5 py-4 last:border-b-0 max-[740px]:grid-cols-1"
            >
              <div className="min-w-0">
                <p className="m-0 truncate text-[1rem] font-semibold text-foreground">
                  {group.item}
                </p>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {translations.groceries.receiptEntries(group.entries.length)}
                </p>
              </div>
              <div className="text-right max-[740px]:flex max-[740px]:items-center max-[740px]:justify-between">
                <span className="hidden text-sm text-muted-foreground max-[740px]:inline">
                  {translations.groceries.table.unitPrice}
                </span>
                <span className="font-semibold">
                  {currencyFormatter.format(group.unitPrice)}
                </span>
              </div>
              <div className="text-right max-[740px]:flex max-[740px]:items-center max-[740px]:justify-between">
                <span className="hidden text-sm text-muted-foreground max-[740px]:inline">
                  {translations.groceries.table.amount}
                </span>
                <span className="font-semibold">{group.quantity}</span>
              </div>
              <div className="text-right max-[740px]:flex max-[740px]:items-center max-[740px]:justify-between">
                <span className="hidden text-sm text-muted-foreground max-[740px]:inline">
                  {translations.groceries.table.total}
                </span>
                <span className="font-semibold">
                  {currencyFormatter.format(group.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MemoizedCategoryDetails = memo(CategoryDetails);

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
      payload.summary.receiptCount,
      payload.summary.total,
      translations.groceries.stats.categoriesActive,
      translations.groceries.stats.itemsTracked,
      translations.groceries.stats.monthTotal,
      translations.groceries.stats.receiptsSaved,
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

        <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-plain-soft)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="m-0 text-sm text-muted-foreground">
                  {stat.label}
                </p>
                <stat.icon className="size-4 text-[var(--accent-dark)]" />
              </div>
              <p className="m-0 mt-3 text-[1.85rem] font-semibold tracking-[-0.04em]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {recentExtractedReceipts.length > 0 ? (
        <section className="grid gap-4 rounded-[30px] border border-[var(--border)] bg-[var(--surface-soft)] p-6 shadow-[var(--shadow)] backdrop-blur-[16px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <p className="m-0 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--accent-dark)]">
                {translations.groceries.recentExtractions}
              </p>
              <p className="m-0 max-w-[70ch] text-sm leading-6 text-muted-foreground">
                {translations.groceries.recentExtractionsDescription}
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1"
            >
              {payload.extractedReceipts.length}{" "}
              {translations.groceries.stats.receiptsSaved.toLowerCase()}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentExtractedReceipts.map((receipt) => (
              <Card
                key={receipt.id}
                className="rounded-[24px] border-[var(--border)] bg-[var(--surface-plain-soft)] py-0 shadow-none"
              >
                <CardContent className="grid gap-4 p-5">
                  <div className="grid gap-1">
                    <p className="m-0 truncate text-[1rem] font-semibold text-foreground">
                      {receipt.sourceFileName ||
                        translations.groceries.untitledReceipt}
                    </p>
                    <p className="m-0 text-sm text-muted-foreground">
                      {dateTimeFormatter.format(new Date(receipt.extractedAt))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <Badge
                      variant="outline"
                      className="border-[var(--border)] bg-[var(--surface-plain)] px-3 py-1"
                    >
                      {translations.receipt.lines(receipt.itemCount)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-[var(--border)] bg-[var(--surface-plain)] px-3 py-1"
                    >
                      {translations.receipt.total(
                        currencyFormatter.format(receipt.total),
                      )}
                    </Badge>
                  </div>

                  {receipt.modelId ? (
                    <p className="m-0 truncate text-sm text-muted-foreground">
                      {translations.receipt.modelLabel}: {receipt.modelId}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {receipt.categories.map((category) => (
                      <Badge
                        key={`${receipt.id}-${category}`}
                        variant="outline"
                        className="border-[rgba(181,82,51,0.16)] bg-[var(--surface-accent)] px-3 py-1 text-[var(--accent-dark)]"
                      >
                        {formatCategoryLabel(category, translations.categories)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {payload.categories.length === 0 ? (
        <Card className="rounded-[28px] border-[var(--border)] bg-[var(--surface-soft)] py-0 shadow-[var(--shadow)]">
          <CardContent className="grid min-h-[280px] place-items-center gap-3 p-8 text-center">
            <div className="grid gap-3">
              <h2 className="m-0 text-[1.8rem] tracking-[-0.04em]">
                {translations.groceries.emptyTitle}
              </h2>
              <p className="m-0 max-w-[48ch] text-muted-foreground">
                {translations.groceries.emptyDescription(
                  formatMonthLabel(payload.month, locale),
                )}
              </p>
              <div>
                <Button asChild>
                  <Link href={homePath}>
                    {translations.groceries.extractReceipt}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <LayoutGroup>
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
            <motion.div
              layout
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {payload.categories.map((category) => {
                const isActive = activeCategory === category.category;

                return (
                  <motion.div key={category.category} layout>
                    <button
                      type="button"
                      onClick={() => handleSelectCategory(category)}
                      className={cn(
                        "group grid h-full w-full gap-4 rounded-[26px] border p-5 text-left shadow-[var(--shadow)] transition-colors",
                        isActive
                          ? "border-[var(--accent)] bg-[var(--surface-accent)] shadow-[0_0_0_4px_var(--focus-surface)]"
                          : "border-[var(--border)] bg-[var(--surface-soft-muted)] hover:bg-[var(--surface-soft)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="m-0 text-[0.76rem] uppercase tracking-[0.2em] text-[var(--accent-dark)]">
                            {formatCategoryLabel(
                              category.category,
                              translations.categories,
                            )}
                          </p>
                          <h2 className="m-0 mt-2 text-[1.85rem] leading-none tracking-[-0.04em]">
                            {currencyFormatter.format(category.total)}
                          </h2>
                        </div>
                        <div className="inline-grid size-10 place-items-center rounded-full border border-[rgba(181,82,51,0.16)] bg-[var(--surface-plain-soft)] text-[var(--accent-dark)]">
                          <ChevronRight
                            className={cn(
                              "size-4 transition-transform",
                              isActive && "rotate-90",
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>
                            {translations.groceries.repeatedGroups(
                              category.uniqueItemCount,
                            )}
                          </span>
                          <span>{percentFormatter.format(category.share)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--progress-track)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              backgroundImage: "var(--accent-gradient)",
                              width: `${Math.max(category.share * 100, 8)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
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
                  {formatCategoryLabel(
                    active.category,
                    translations.categories,
                  )}
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
