"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import type { GroceriesMonthPayload } from "@/lib/groceries";
import type { Messages } from "@/lib/i18n/messages";
import { formatCategoryLabel } from "@/lib/receipt";

const parseJsonResponse = async <T,>(response: Response): Promise<T> => {
  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error("The server returned an empty response.");
  }

  return JSON.parse(responseText) as T;
};

type GroceriesDashboardRecentReceiptsSectionProps = {
  boardId: string;
  receipts: GroceriesMonthPayload["extractedReceipts"];
  translations: Messages;
  currencyFormatter: Intl.NumberFormat;
  dateTimeFormatter: Intl.DateTimeFormat;
};

export const GroceriesDashboardRecentReceiptsSection = ({
  boardId,
  receipts,
  translations,
  currencyFormatter,
  dateTimeFormatter,
}: GroceriesDashboardRecentReceiptsSectionProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [receiptPendingDelete, setReceiptPendingDelete] = useState<
    GroceriesMonthPayload["extractedReceipts"][number] | null
  >(null);

  const handleDeleteReceipt = useCallback(async () => {
    if (!receiptPendingDelete) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/expenses", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boardId,
          receiptId: receiptPendingDelete.id,
        }),
      });
      const payload = await parseJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(
          payload.error || translations.groceries.deleteReceiptFailed,
        );
      }

      setReceiptPendingDelete(null);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : translations.groceries.deleteReceiptFailed,
      );
    } finally {
      setIsDeleting(false);
    }
  }, [boardId, receiptPendingDelete, router, translations.groceries.deleteReceiptFailed]);

  if (receipts.length === 0) {
    return null;
  }

  const receiptName =
    receiptPendingDelete?.sourceFileName || translations.groceries.untitledReceipt;

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

      {error ? (
        <Alert variant="destructive" className="border-destructive/25 bg-destructive/5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {receipts.map((receipt) => (
          <Card
            key={receipt.id}
            className="rounded-[24px] border-[var(--border)] bg-[var(--surface-plain-soft)] py-0 shadow-none"
          >
            <CardContent className="grid gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="m-0 truncate text-[1rem] font-semibold text-foreground">
                    {receipt.sourceFileName || translations.groceries.untitledReceipt}
                  </p>
                  <p className="m-0 text-sm text-muted-foreground">
                    {dateTimeFormatter.format(new Date(receipt.extractedAt))}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-plain)] text-destructive hover:bg-destructive/8 hover:text-destructive"
                  aria-label={translations.groceries.deleteReceipt}
                  disabled={isDeleting}
                  onClick={() => {
                    setError(null);
                    setReceiptPendingDelete(receipt);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
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

      <Dialog
        open={receiptPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setReceiptPendingDelete(null);
          }
        }}
      >
        <DialogContent className="sm:w-[min(520px,calc(100vw-32px))] sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{translations.groceries.deleteReceiptTitle}</DialogTitle>
            <DialogDescription>
              {translations.groceries.deleteReceiptDescription(receiptName)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReceiptPendingDelete(null)}
              disabled={isDeleting}
            >
              {translations.common.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteReceipt}
              disabled={isDeleting}
            >
              {isDeleting
                ? translations.groceries.deletingReceipt
                : translations.groceries.deleteReceiptConfirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};