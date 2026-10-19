"use client";

import { CalendarDays } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import {
  formatMonthLabel,
  shiftMonthKey,
  type GroceriesMonthPayload,
  type MonthOption,
} from "@/lib/groceries";
import type { AppLocale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

type DashboardStat = {
  label: string;
  value: string;
  icon: typeof CalendarDays;
};

type GroceriesDashboardSummarySectionProps = {
  boardId?: string;
  payload: GroceriesMonthPayload;
  currentMonth: string;
  monthOptions: MonthOption[];
  locale: AppLocale;
  statCards: DashboardStat[];
  translations: Messages;
  onMonthChange: (month: string) => void;
};

const buildDashboardHref = (
  boardId: string | undefined,
  month: string,
  currentMonth: string,
) => {
  const query: Record<string, string> = {};

  if (boardId) {
    query.board = boardId;
  }

  if (month !== currentMonth) {
    query.month = month;
  }

  return Object.keys(query).length > 0
    ? { pathname: "/groceries", query }
    : "/groceries";
};

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

const StatsGrid = ({ stats }: { stats: DashboardStat[] }) => {
  return (
    <div
      className={
        stats.length >= 5
          ? "grid grid-cols-5 gap-4 max-[1200px]:grid-cols-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1"
          : "grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1"
      }
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group rounded-[24px] border border-[var(--border)] bg-[var(--surface-plain-soft)]/90 p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-[var(--surface-plain)] hover:shadow-md backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 text-sm font-medium text-muted-foreground">{stat.label}</p>
            <div className="inline-grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-transform duration-200 group-hover:scale-110 shadow-2xs">
              <stat.icon className="size-4" aria-hidden="true" />
            </div>
          </div>
          <p className="m-0 mt-3 text-[1.85rem] font-bold tracking-tight text-foreground tabular-nums">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
};

export const GroceriesDashboardSummarySection = ({
  boardId,
  payload,
  currentMonth,
  monthOptions,
  locale,
  statCards,
  translations,
  onMonthChange,
}: GroceriesDashboardSummarySectionProps) => {
  const progress = getMonthProgress(payload.month);
  const isCurrentMonth = payload.month === currentMonth;
  const previousMonth = shiftMonthKey(payload.month, -1);
  const nextMonth = shiftMonthKey(payload.month, 1);
  const nextMonthDisabled = nextMonth > currentMonth;
  const previousMonthHref = useMemo(
    () => buildDashboardHref(boardId, previousMonth, currentMonth),
    [boardId, currentMonth, previousMonth],
  );
  const nextMonthHref = useMemo(
    () => buildDashboardHref(boardId, nextMonth, currentMonth),
    [boardId, currentMonth, nextMonth],
  );

  return (
    <section className="grid gap-6 rounded-[32px] border border-[var(--border)] bg-[var(--surface-soft)] p-7 shadow-[var(--shadow)] backdrop-blur-[20px] transition-all duration-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[0.76rem] font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
            <span>{translations.groceries.eyebrow}</span>
            <span className="text-muted-foreground font-medium">
              {isCurrentMonth
                ? translations.groceries.currentMonthView
                : translations.groceries.historicalMonthView}
            </span>
          </div>
          <div>
            <h1 className="m-0 text-[clamp(2.6rem,6vw,4.8rem)] font-extrabold leading-[0.92] tracking-[-0.05em] text-balance text-foreground">
              {formatMonthLabel(payload.month, locale)}
            </h1>
            <p className="m-0 mt-3 max-w-[62ch] text-[1.02rem] leading-7 text-muted-foreground">
              {translations.groceries.heroDescription}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-[700px]:w-full">
          <Button
            asChild
            variant="secondary"
            className="border-[var(--border)] bg-[var(--surface-plain)] shadow-2xs hover:bg-[var(--surface-plain-soft)] hover:border-blue-500/30 rounded-full h-10 px-4"
          >
            <Link
              href={previousMonthHref}
              locale={locale}
              prefetch={true}
              onClick={(event) => {
                event.preventDefault();
                onMonthChange(previousMonth);
              }}
            >
              {translations.groceries.previousMonth}
            </Link>
          </Button>
          <Select value={payload.month} onValueChange={onMonthChange}>
            <SelectTrigger
              className="min-w-[210px] rounded-full border-[var(--border)] bg-[var(--surface-plain)] h-10 shadow-2xs hover:bg-[var(--surface-plain-soft)]"
              aria-label={translations.groceries.selectMonth}
            >
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
              className="border-[var(--border)] bg-[var(--surface-plain-soft)] rounded-full h-10 px-4"
              disabled
            >
              {translations.groceries.nextMonth}
            </Button>
          ) : (
            <Button
              asChild
              variant="secondary"
              className="border-[var(--border)] bg-[var(--surface-plain)] shadow-2xs hover:bg-[var(--surface-plain-soft)] hover:border-blue-500/30 rounded-full h-10 px-4"
            >
              <Link
                href={nextMonthHref}
                locale={locale}
                prefetch={true}
                onClick={(event) => {
                  event.preventDefault();
                  onMonthChange(nextMonth);
                }}
              >
                {translations.groceries.nextMonth}
              </Link>
            </Button>
          )}
          <Button
            asChild
            variant="secondary"
            className="border-[var(--border)] bg-[var(--surface-plain)] shadow-2xs hover:bg-[var(--surface-plain-soft)] hover:border-blue-500/30 max-[700px]:ml-auto rounded-full h-10 px-4"
          >
            <Link href="/" locale={locale} prefetch={true}>{translations.groceries.backToUpload}</Link>
          </Button>
        </div>
      </div>

      <div
        className="grid gap-4 rounded-[26px] border border-[var(--border)] p-5 shadow-2xs backdrop-blur-md"
        style={{ background: "var(--progress-surface)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <div className="inline-grid size-7 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarDays className="size-4" aria-hidden="true" />
            </div>
            <span>{translations.groceries.monthProgress}</span>
          </div>
          <p className="m-0 text-sm font-medium text-muted-foreground tabular-nums">
            {translations.groceries.dayOf(progress.currentDay, progress.totalDays)}
          </p>
        </div>

        <div className="grid gap-2">
          <div
            role="progressbar"
            aria-label={translations.groceries.monthProgress}
            aria-valuemin={1}
            aria-valuemax={progress.totalDays}
            aria-valuenow={progress.currentDay}
            aria-valuetext={translations.groceries.dayOf(progress.currentDay, progress.totalDays)}
            className="relative h-3.5 overflow-hidden rounded-full bg-[var(--progress-track)]"
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.progress * 100}%` }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{ backgroundImage: "var(--accent-gradient)" }}
            />
            <div
              className="absolute top-1/2 z-10 size-5.5 -translate-y-1/2 rounded-full border-2 border-[var(--surface-plain)] bg-blue-600 dark:bg-blue-500 shadow-[0_4px_14px_rgba(59,130,246,0.4)]"
              style={{ left: `calc(${progress.progress * 100}% - 11px)` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium" aria-hidden="true">
            <span>1</span>
            <span>{Math.ceil(progress.totalDays / 2)}</span>
            <span>{progress.totalDays}</span>
          </div>
        </div>
      </div>

      <StatsGrid stats={statCards} />
    </section>
  );
};