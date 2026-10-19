"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  type GroceryCategorySummary,
} from "@/lib/groceries";
import type { Messages } from "@/lib/i18n/messages";
import { formatCategoryLabel } from "@/lib/receipt";
import { cn } from "@/lib/utils";

type CategoryDetailsProps = {
  category: GroceryCategorySummary;
  categoryLabel: string;
  translations: Messages;
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

      <div
        role="table"
        aria-label={categoryLabel}
        className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface-plain-soft)]"
      >
        <div
          role="rowgroup"
          className="border-b border-[var(--border)] max-[740px]:hidden"
        >
          <div
            role="row"
            className="grid grid-cols-[repeat(4,1fr)] gap-4 px-5 py-3 text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-dark)]"
          >
            <span role="columnheader">{translations.groceries.table.item}</span>
            <span role="columnheader" className="text-right">{translations.groceries.table.unitPrice}</span>
            <span role="columnheader" className="text-right">{translations.groceries.table.amount}</span>
            <span role="columnheader" className="text-right">{translations.groceries.table.total}</span>
          </div>
        </div>

        <div role="rowgroup" className="grid gap-0">
          {category.groups.map((group) => (
            <div
              key={group.normalizedItem}
              role="row"
              className="grid grid-cols-[repeat(4,1fr)] gap-4 border-b border-[var(--border)] px-5 py-4 last:border-b-0 max-[740px]:grid-cols-1"
            >
              <div role="cell" className="min-w-0">
                <p className="m-0 text-[1rem] font-semibold text-foreground">
                  {group.item}
                </p>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {translations.groceries.receiptEntries(group.entries.length)}
                </p>
              </div>
              <div role="cell" className="text-right max-[740px]:flex max-[740px]:items-center max-[740px]:justify-between">
                <span className="hidden text-sm text-muted-foreground max-[740px]:inline">
                  {translations.groceries.table.unitPrice}
                </span>
                <span className="font-semibold">
                  {currencyFormatter.format(group.unitPrice)}
                </span>
              </div>
              <div role="cell" className="text-right max-[740px]:flex max-[740px]:items-center max-[740px]:justify-between">
                <span className="hidden text-sm text-muted-foreground max-[740px]:inline">
                  {translations.groceries.table.amount}
                </span>
                <span className="font-semibold">{group.quantity}</span>
              </div>
              <div role="cell" className="text-right max-[740px]:flex max-[740px]:items-center max-[740px]:justify-between">
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
  translations: Messages;
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
        aria-pressed={isActive}
        className={cn(
          "group grid h-full w-full gap-4 rounded-[26px] border p-5 text-left shadow-[var(--shadow)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          isActive
            ? "border-blue-500 bg-blue-500/10 shadow-[0_0_0_4px_var(--focus-surface)]"
            : "border-[var(--border)] bg-[var(--surface-soft-muted)] hover:border-blue-500/35 hover:bg-[var(--surface-soft)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[0.76rem] uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300 font-bold">
              {formatCategoryLabel(category.category, translations.categories)}
            </p>
            <h2 className="m-0 mt-2 text-[1.85rem] font-bold leading-none tracking-[-0.04em] tabular-nums text-foreground">
              {currencyFormatter.format(category.total)}
            </h2>
          </div>
          <div
            className="inline-grid size-10 place-items-center rounded-full border border-blue-500/20 bg-[var(--surface-plain-soft)] text-blue-600 dark:text-blue-400 shadow-2xs transition-transform duration-200 group-hover:scale-105"
            aria-hidden="true"
          >
            <ChevronRight
              className={cn("size-4 transition-transform duration-200", isActive && "rotate-90")}
            />
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {translations.groceries.repeatedGroups(category.uniqueItemCount)}
            </span>
            <span className="tabular-nums">{percentFormatter.format(category.share)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--progress-track)]" aria-hidden="true">
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{ width: `${Math.max(category.share * 100, 8)}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                backgroundImage: "var(--accent-gradient)",
              }}
            />
          </div>
        </div>
      </button>
    </motion.div>
  );
};
