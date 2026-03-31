"use client";

import { CalendarDays, ChevronRight, Package2, ReceiptText } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    formatMonthLabel,
    shiftMonthKey,
    type GroceriesMonthPayload,
    type GroceryCategorySummary,
    type MonthOption,
} from "@/lib/groceries";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

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

  return { totalDays, currentDay, progress: Math.min(Math.max(progress, 0), 1) };
};

const CategoryDetails = ({
  category,
  className,
}: {
  category: GroceryCategorySummary;
  className?: string;
}) => {
  return (
    <div className={cn("grid gap-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--accent-dark)]">
            {category.label}
          </p>
          <h3 className="m-0 mt-1 text-[1.9rem] leading-none tracking-[-0.04em]">
            {currencyFormatter.format(category.total)}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1">
            {category.itemCount} units
          </Badge>
          <Badge variant="outline" className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1">
            {category.uniqueItemCount} unique items
          </Badge>
          <Badge variant="outline" className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1">
            {percentFormatter.format(category.share)} of month
          </Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface-plain-soft)]">
        <div className="grid grid-cols-[minmax(0,1.4fr)_120px_120px_120px] gap-4 border-b border-[var(--border)] px-5 py-3 text-[0.76rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-dark)] max-[740px]:hidden">
          <span>Item</span>
          <span className="text-right">Unit Price</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Total</span>
        </div>

        <div className="grid gap-0">
          {category.groups.map((group) => (
            <div
              key={group.normalizedItem}
              className="grid grid-cols-[minmax(0,1.4fr)_120px_120px_120px] gap-4 border-b border-[var(--border)] px-5 py-4 last:border-b-0 max-[740px]:grid-cols-1"
            >
              <div className="min-w-0">
                <p className="m-0 truncate text-[1rem] font-semibold text-foreground">{group.item}</p>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {group.entries.length} receipt entr{group.entries.length === 1 ? "y" : "ies"}
                </p>
              </div>
              <div className="text-right max-[740px]:flex max-[740px]:items-center max-[740px]:justify-between">
                <span className="hidden text-sm text-muted-foreground max-[740px]:inline">Unit price</span>
                <span className="font-semibold">{currencyFormatter.format(group.unitPrice)}</span>
              </div>
              <div className="text-right max-[740px]:flex max-[740px]:items-center max-[740px]:justify-between">
                <span className="hidden text-sm text-muted-foreground max-[740px]:inline">Amount</span>
                <span className="font-semibold">{group.quantity}</span>
              </div>
              <div className="text-right max-[740px]:flex max-[740px]:items-center max-[740px]:justify-between">
                <span className="hidden text-sm text-muted-foreground max-[740px]:inline">Total</span>
                <span className="font-semibold">{currencyFormatter.format(group.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string | null>(payload.categories[0]?.category ?? null);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (payload.categories.length === 0) {
      setActiveCategory(null);
      return;
    }

    if (!payload.categories.some((category) => category.category === activeCategory)) {
      setActiveCategory(payload.categories[0].category);
    }
  }, [activeCategory, payload.categories]);

  const progress = useMemo(() => getMonthProgress(payload.month), [payload.month]);
  const active = payload.categories.find((category) => category.category === activeCategory) ?? null;
  const isCurrentMonth = payload.month === currentMonth;
  const previousMonth = shiftMonthKey(payload.month, -1);
  const nextMonth = shiftMonthKey(payload.month, 1);
  const nextMonthDisabled = nextMonth > currentMonth;

  const handleSelectCategory = (category: GroceryCategorySummary) => {
    setActiveCategory(category.category);
    if (typeof window !== "undefined" && window.innerWidth < 900) {
      setIsMobileDetailOpen(true);
    }
  };

  const handleMonthChange = (month: string) => {
    router.push(month === currentMonth ? "/groceries" : `/groceries?month=${month}`);
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-5 rounded-[30px] border border-[var(--border)] bg-[var(--surface-soft)] p-6 shadow-[var(--shadow)] backdrop-blur-[16px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--accent-dark)]">
              <span>Groceries</span>
              <span className="text-[var(--muted-foreground)]">
                {isCurrentMonth ? "Current month view" : "Historical month view"}
              </span>
            </div>
            <div>
              <h1 className="m-0 text-[clamp(2.6rem,6vw,5rem)] leading-[0.92] tracking-[-0.05em] text-balance">
                {formatMonthLabel(payload.month)}
              </h1>
              <p className="m-0 mt-3 max-w-[62ch] text-[1rem] leading-7 text-muted-foreground">
                A live category map of what has landed in the basket so far this month, with fast drill-down into repeated items.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 max-[700px]:w-full">
            <Button asChild variant="secondary" className="border-[var(--border)] bg-[var(--surface-plain)]">
              <Link href={previousMonth === currentMonth ? "/groceries" : `/groceries?month=${previousMonth}`}>
                Previous month
              </Link>
            </Button>
            <Select value={payload.month} onValueChange={handleMonthChange}>
              <SelectTrigger className="min-w-[210px] rounded-full border-[var(--border)] bg-[var(--surface-plain)]">
                <SelectValue placeholder="Select month" />
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
              <Button variant="secondary" className="border-[var(--border)] bg-[var(--surface-plain-soft)]" disabled>
                Next month
              </Button>
            ) : (
              <Button asChild variant="secondary" className="border-[var(--border)] bg-[var(--surface-plain)]">
                <Link href={nextMonth === currentMonth ? "/groceries" : `/groceries?month=${nextMonth}`}>
                  Next month
                </Link>
              </Button>
            )}
            <Button asChild variant="secondary" className="border-[var(--border)] bg-[var(--surface-plain)] max-[700px]:ml-auto">
              <Link href="/">Back to receipt upload</Link>
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
              <span>Month progress</span>
            </div>
            <p className="m-0 text-sm text-muted-foreground">
              Day {progress.currentDay} of {progress.totalDays}
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
          {[
            {
              label: "Month total",
              value: currencyFormatter.format(payload.summary.total),
              icon: ReceiptText,
            },
            {
              label: "Items tracked",
              value: String(payload.summary.itemCount),
              icon: Package2,
            },
            {
              label: "Receipts saved",
              value: String(payload.summary.receiptCount),
              icon: ReceiptText,
            },
            {
              label: "Categories active",
              value: String(payload.summary.categoryCount),
              icon: CalendarDays,
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-plain-soft)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="m-0 text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className="size-4 text-[var(--accent-dark)]" />
              </div>
              <p className="m-0 mt-3 text-[1.85rem] font-semibold tracking-[-0.04em]">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {payload.categories.length === 0 ? (
        <Card className="rounded-[28px] border-[var(--border)] bg-[var(--surface-soft)] py-0 shadow-[var(--shadow)]">
          <CardContent className="grid min-h-[280px] place-items-center gap-3 p-8 text-center">
            <div className="grid gap-3">
              <h2 className="m-0 text-[1.8rem] tracking-[-0.04em]">No groceries saved for this month yet</h2>
              <p className="m-0 max-w-[48ch] text-muted-foreground">
                Extract a grocery receipt, save the categorized result, and {formatMonthLabel(payload.month)} will bloom into the month view automatically.
              </p>
              <div>
                <Button asChild>
                  <Link href="/">Extract a receipt</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <LayoutGroup>
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
            <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                            {category.label}
                          </p>
                          <h2 className="m-0 mt-2 text-[1.85rem] leading-none tracking-[-0.04em]">
                            {currencyFormatter.format(category.total)}
                          </h2>
                        </div>
                        <div className="inline-grid size-10 place-items-center rounded-full border border-[rgba(181,82,51,0.16)] bg-[var(--surface-plain-soft)] text-[var(--accent-dark)]">
                          <ChevronRight className={cn("size-4 transition-transform", isActive && "rotate-90")} />
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{category.uniqueItemCount} repeated item groups</span>
                          <span>{percentFormatter.format(category.share)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--progress-track)]">
                          <div
                            className="h-full rounded-full"
                            style={{ backgroundImage: "var(--accent-gradient)", width: `${Math.max(category.share * 100, 8)}%` }}
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
                        <CategoryDetails category={active} />
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
                <DialogTitle>{active.label}</DialogTitle>
                <DialogDescription>
                  Repeated items, quantity rollups, and spend for this category so far this month.
                </DialogDescription>
              </DialogHeader>
              <CategoryDetails category={active} className="mt-4" />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
