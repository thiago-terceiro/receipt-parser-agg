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
              <Link href="/" locale={locale}>{translations.groceries.extractReceipt}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};