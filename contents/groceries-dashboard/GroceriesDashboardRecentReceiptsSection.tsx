"use client";

import { useTranslations } from "@/components/locale-utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { GroceriesMonthPayload } from "@/lib/groceries";
import { formatCategoryLabel } from "@/lib/receipt";

type DashboardTranslations = ReturnType<typeof useTranslations>;

type GroceriesDashboardRecentReceiptsSectionProps = {
  receipts: GroceriesMonthPayload["extractedReceipts"];
  translations: DashboardTranslations;
  currencyFormatter: Intl.NumberFormat;
  dateTimeFormatter: Intl.DateTimeFormat;
};

export const GroceriesDashboardRecentReceiptsSection = ({
  receipts,
  translations,
  currencyFormatter,
  dateTimeFormatter,
}: GroceriesDashboardRecentReceiptsSectionProps) => {
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
                  {translations.receipt.total(currencyFormatter.format(receipt.total))}
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