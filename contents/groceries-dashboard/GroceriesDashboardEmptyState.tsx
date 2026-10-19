"use client";


import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatMonthLabel } from "@/lib/groceries";
import type { AppLocale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

type GroceriesDashboardEmptyStateProps = {
  month: string;
  locale: AppLocale;
  translations: Messages;
};

export const GroceriesDashboardEmptyState = ({
  month,
  locale,
  translations,
}: GroceriesDashboardEmptyStateProps) => {
  return (
    <Card className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-soft)]/90 py-0 shadow-[var(--shadow)] backdrop-blur-[20px]">
      <CardContent className="grid min-h-[290px] place-items-center gap-3 p-8 text-center">
        <div className="grid gap-3 place-items-center">
          <h2 className="m-0 text-[1.85rem] font-bold tracking-tight text-foreground">
            {translations.groceries.emptyTitle}
          </h2>
          <p className="m-0 max-w-[48ch] text-[1.02rem] leading-relaxed text-muted-foreground">
            {translations.groceries.emptyDescription(formatMonthLabel(month, locale))}
          </p>
          <div className="pt-2">
            <Button asChild className="rounded-full h-11 px-6 font-semibold shadow-xs hover:shadow-md">
              <Link href="/" locale={locale} prefetch={true}>{translations.groceries.extractReceipt}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};