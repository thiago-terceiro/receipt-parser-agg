"use client";

import { CalendarDays } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { useTranslations } from "@/components/locale-utils";
import { Button } from "@/components/ui/button";
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
    type MonthOption,
} from "@/lib/groceries";

type DashboardTranslations = ReturnType<typeof useTranslations>;

type DashboardStat = {
  label: string;
  value: string;
  icon: typeof CalendarDays;
};

type GroceriesDashboardSummarySectionProps = {
  payload: GroceriesMonthPayload;
  currentMonth: string;
  monthOptions: MonthOption[];
  locale: string;
  groceriesPath: string;
  homePath: string;
  statCards: DashboardStat[];
  translations: DashboardTranslations;
  onMonthChange: (month: string) => void;
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

export const GroceriesDashboardSummarySection = ({
  payload,
  currentMonth,
  monthOptions,
  locale,
  groceriesPath,
  homePath,
  statCards,
  translations,
  onMonthChange,
}: GroceriesDashboardSummarySectionProps) => {
  const progress = getMonthProgress(payload.month);
  const isCurrentMonth = payload.month === currentMonth;
  const previousMonth = shiftMonthKey(payload.month, -1);
  const nextMonth = shiftMonthKey(payload.month, 1);
  const nextMonthDisabled = nextMonth > currentMonth;

  return (
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
          <Select value={payload.month} onValueChange={onMonthChange}>
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
            {translations.groceries.dayOf(progress.currentDay, progress.totalDays)}
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
  );
};