"use client";

import { CalendarDays, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { memo } from "react";

import { useTranslations } from "@/components/locale-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatMonthLabel,
  type GroceriesMonthPayload,
  type GroceryCategorySummary,
} from "@/lib/groceries";
import { formatCategoryLabel } from "@/lib/receipt";
import { cn } from "@/lib/utils";

type DashboardTranslations = ReturnType<typeof useTranslations>;

type CategoryDetailsProps = {
  category: GroceryCategorySummary;
  categoryLabel: string;
  translations: DashboardTranslations;
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
            {percentFormatter.format(category.share)} {translations.groceries.ofMonth}
          </Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface-plain-soft)]">
        <div className="grid grid-cols-[repeat(4,1fr)] gap-4 border-b border-[var(--border)] px-5 py-3 text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-dark)] max-[740px]:hidden">
          <span>{translations.groceries.table.item}</span>
          <span className="text-right">{translations.groceries.table.unitPrice}</span>
          <span className="text-right">{translations.groceries.table.amount}</span>
          <span className="text-right">{translations.groceries.table.total}</span>
        </div>

        <div className="grid   gap-0">
          {category.groups.map((group) => (
            <div
              key={group.normalizedItem}
              className="grid grid-cols-[repeat(4,1fr)] gap-4 border-b border-[var(--border)] px-5 py-4 last:border-b-0 max-[740px]:grid-cols-1"
            >
              <div className="min-w-0">
                <p className="m-0 text-[1rem] font-semibold text-foreground">
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

export const MemoizedCategoryDetails = memo(CategoryDetails);

type CategorySummaryCardProps = {
  category: GroceryCategorySummary;
  isActive: boolean;
  translations: DashboardTranslations;
  currencyFormatter: Intl.NumberFormat;
  percentFormatter: Intl.NumberFormat;
  onSelect: (category: GroceryCategorySummary) => void;
};

export const CategorySummaryCard = ({
  category,
  isActive,
  translations,
  currencyFormatter,
  percentFormatter,
  onSelect,
}: CategorySummaryCardProps) => {
  return (
    <motion.div layout>
      <button
        type="button"
        onClick={() => onSelect(category)}
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
              {formatCategoryLabel(category.category, translations.categories)}
            </p>
            <h2 className="m-0 mt-2 text-[1.85rem] leading-none tracking-[-0.04em]">
              {currencyFormatter.format(category.total)}
            </h2>
          </div>
          <div className="inline-grid size-10 place-items-center rounded-full border border-[rgba(181,82,51,0.16)] bg-[var(--surface-plain-soft)] text-[var(--accent-dark)]">
            <ChevronRight
              className={cn("size-4 transition-transform", isActive && "rotate-90")}
            />
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {translations.groceries.repeatedGroups(category.uniqueItemCount)}
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
};

type DashboardStat = {
  label: string;
  value: string;
  icon: typeof CalendarDays;
};

type StatsGridProps = {
  stats: DashboardStat[];
};

export const StatsGrid = ({ stats }: StatsGridProps) => {
  return (
    <div
      className={cn(
        "grid gap-4 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1",
        stats.length >= 5 ? "grid-cols-5 max-[1200px]:grid-cols-3" : "grid-cols-4",
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-plain-soft)] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted-foreground">{stat.label}</p>
            <stat.icon className="size-4 text-[var(--accent-dark)]" />
          </div>
          <p className="m-0 mt-3 text-[1.85rem] font-semibold tracking-[-0.04em]">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
};

type RecentExtractedReceiptsSectionProps = {
  receipts: GroceriesMonthPayload["extractedReceipts"];
  translations: DashboardTranslations;
  currencyFormatter: Intl.NumberFormat;
  dateTimeFormatter: Intl.DateTimeFormat;
};

export const RecentExtractedReceiptsSection = ({
  receipts,
  translations,
  currencyFormatter,
  dateTimeFormatter,
}: RecentExtractedReceiptsSectionProps) => {
  if (receipts.length === 0) {
    return null;
  }

  return (
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
          {receipts.length} {translations.groceries.stats.receiptsSaved.toLowerCase()}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {receipts.map((receipt) => (
          <Card
            key={receipt.id}
            className="rounded-[24px] border-[var(--border)] bg-[var(--surface-plain-soft)] py-0 shadow-none"
          >
            <CardContent className="grid gap-4 p-5">
              <div className="grid gap-1">
                <p className="m-0 truncate text-[1rem] font-semibold text-foreground">
                  {receipt.sourceFileName || translations.groceries.untitledReceipt}
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
  );
};

type EmptyStateCardProps = {
  homePath: string;
  month: string;
  locale: string;
  translations: DashboardTranslations;
};

export const EmptyStateCard = ({
  homePath,
  month,
  locale,
  translations,
}: EmptyStateCardProps) => {
  return (
    <Card className="rounded-[28px] border-[var(--border)] bg-[var(--surface-soft)] py-0 shadow-[var(--shadow)]">
      <CardContent className="grid min-h-[280px] place-items-center gap-3 p-8 text-center">
        <div className="grid gap-3">
          <h2 className="m-0 text-[1.8rem] tracking-[-0.04em]">
            {translations.groceries.emptyTitle}
          </h2>
          <p className="m-0 max-w-[48ch] text-muted-foreground">
            {translations.groceries.emptyDescription(formatMonthLabel(month, locale))}
          </p>
          <div>
            <Button asChild>
              <Link href={homePath}>{translations.groceries.extractReceipt}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};