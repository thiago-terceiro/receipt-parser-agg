"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";

import { useTranslations } from "@/components/locale-utils";
import { Badge } from "@/components/ui/badge";
import {
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
