"use client";

import { LayoutDashboard } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { ExtractionResponse } from "@/context/ReceiptWorkspaceStateProvider";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { formatCategoryLabel, type ReceiptItem } from "@/lib/receipt";

type WorkspaceTranslations = Pick<Messages, "categories" | "common" | "receipt">;

type ReceiptWorkspaceResultsSectionProps = {
    correctedCount: number;
    currencyFormatter: Intl.NumberFormat;
    dashboardHref:
    | string
    | {
        pathname: string;
        query: Record<string, string>;
    };
    displayedItems: ReceiptItem[];
    displayedFileName: string | null;
    displayedTotal: number;
    editedItems: Record<number, ReceiptItem>;
    isAuthenticated: boolean;
    isSaving: boolean;
    locale: AppLocale;
    previewUrl: string | null;
    result: ExtractionResponse | null;
    saveMessage: string | null;
    showRawResponse: boolean;
    translations: WorkspaceTranslations;
    onEditItem: (index: number) => void;
    onSaveGroceries: () => void;
    onToggleRawResponse: () => void;
};

export const ReceiptWorkspaceResultsSection = ({
    correctedCount,
    currencyFormatter,
    dashboardHref,
    displayedItems,
    displayedFileName,
    displayedTotal,
    editedItems,
    isAuthenticated,
    isSaving,
    locale,
    previewUrl,
    result,
    saveMessage,
    showRawResponse,
    translations,
    onEditItem,
    onSaveGroceries,
    onToggleRawResponse,
}: ReceiptWorkspaceResultsSectionProps) => {
    return (
        <section className="mt-6 grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
            <Card className="gap-0 rounded-[24px] border-[var(--border)] py-0 shadow-[var(--shadow)] backdrop-blur-[16px]">
                <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
                    <h2 className="m-0 text-[1.4rem]">{translations.receipt.preview}</h2>
                    <span className="text-sm text-muted-foreground">
                        {displayedFileName ?? translations.receipt.noFileSelected}
                    </span>
                </div>
                <CardContent className="p-6">
                    {previewUrl ? (
                        <Image
                            className="receipt-preview"
                            src={previewUrl}
                            alt={translations.receipt.previewAlt}
                            width={1200}
                            height={1600}
                            unoptimized
                        />
                    ) : (
                        <div className="grid min-h-[240px] place-items-center rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--surface-plain-muted)] p-6 text-center text-muted-foreground">
                            {translations.receipt.previewPlaceholder}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="gap-0 rounded-[24px] border-[var(--border)] py-0 shadow-[var(--shadow)] backdrop-blur-[16px]">
                <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
                    <h2 className="m-0 text-[1.4rem]">{translations.receipt.extractedItems}</h2>
                    <span className="text-sm text-muted-foreground">
                        {result ? result.modelId : translations.receipt.waitingForExtraction}
                    </span>
                </div>
                <CardContent className="p-6">
                    {result ? (
                        <>
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <p className="m-0 text-sm text-muted-foreground">
                                    {translations.receipt.servedBy(result.backend)}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge
                                        variant="outline"
                                        className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1"
                                    >
                                        {translations.receipt.lines(displayedItems.length)}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1"
                                    >
                                        {translations.receipt.total(currencyFormatter.format(displayedTotal))}
                                    </Badge>
                                    {correctedCount > 0 ? (
                                        <Badge
                                            variant="outline"
                                            className="border-[rgba(181,82,51,0.24)] bg-[var(--surface-accent)] px-3 py-1 text-[var(--accent-dark)]"
                                        >
                                            {translations.receipt.corrected(correctedCount)}
                                        </Badge>
                                    ) : null}
                                </div>
                            </div>
                            <div className="mb-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-4 py-3 text-sm text-muted-foreground">
                                {translations.receipt.reviewHint}
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{translations.receipt.table.item}</TableHead>
                                        <TableHead>{translations.receipt.table.category}</TableHead>
                                        <TableHead className="text-right">
                                            {translations.receipt.table.quantity}
                                        </TableHead>
                                        <TableHead className="text-right">
                                            {translations.receipt.table.unit}
                                        </TableHead>
                                        <TableHead className="text-right">
                                            {translations.receipt.table.total}
                                        </TableHead>
                                        <TableHead className="text-right">
                                            {translations.receipt.table.adjust}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayedItems.map((entry, index) => (
                                        <TableRow
                                            key={`${entry.normalizedItem}-${entry.lineTotal}-${entry.quantity}-${index}`}
                                        >
                                            <TableCell>{entry.item}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-2.5 py-1"
                                                >
                                                    {formatCategoryLabel(entry.category, translations.categories)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{entry.quantity}</TableCell>
                                            <TableCell className="text-right">
                                                {currencyFormatter.format(entry.unitPrice)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {currencyFormatter.format(entry.lineTotal)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {editedItems[index] ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-[rgba(181,82,51,0.24)] bg-[var(--surface-accent)] px-2.5 py-1 text-[var(--accent-dark)]"
                                                        >
                                                            {translations.receipt.alerts.corrected}
                                                        </Badge>
                                                    ) : null}
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        className="border-[var(--border)] bg-[var(--surface-plain)]"
                                                        onClick={() => onEditItem(index)}
                                                    >
                                                        {translations.receipt.alerts.adjust}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-4 py-4">
                                <div className="grid gap-1">
                                    <p className="m-0 text-[0.95rem] font-semibold">
                                        {translations.receipt.saveCardTitle}
                                    </p>
                                    <p className="m-0 text-sm text-muted-foreground">
                                        {isAuthenticated
                                            ? translations.receipt.saveSignedIn
                                            : translations.receipt.saveSignedOut}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        onClick={onSaveGroceries}
                                        disabled={!isAuthenticated || isSaving}
                                    >
                                        {isSaving
                                            ? translations.receipt.saving
                                            : translations.receipt.saveGroceries}
                                    </Button>
                                    <Button
                                        asChild
                                        variant="secondary"
                                        className="border-[var(--border)] bg-[var(--surface-plain)]"
                                    >
                                        <Link href={dashboardHref} locale={locale}>
                                            <LayoutDashboard className="size-4" />
                                            <span>
                                                {saveMessage
                                                    ? translations.receipt.openFreshDashboard
                                                    : translations.receipt.openDashboard}
                                            </span>
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-5 grid gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="justify-start px-0"
                                    onClick={onToggleRawResponse}
                                >
                                    {showRawResponse ? "Hide raw response" : "Show raw response"}
                                </Button>
                                {showRawResponse ? (
                                    <pre className="raw-response max-h-56 overflow-auto">
                                        {result.rawResponse}
                                    </pre>
                                ) : null}
                            </div>
                        </>
                    ) : (
                        <div className="grid min-h-[240px] place-items-center rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--surface-plain-muted)] p-6 text-center text-muted-foreground">
                            {translations.receipt.resultPlaceholder}
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>
    );
};