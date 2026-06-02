"use client";

import { LayoutDashboard } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import type { BoardSummary } from "@/lib/boards";
import type { AppLocale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { formatCategoryLabel, type ReceiptItem } from "@/lib/receipt";
import type { ReceiptUploadKind } from "@/lib/receipt-upload";

type WorkspaceTranslations = Pick<Messages, "categories" | "common" | "receipt">;

const COMPACT_RESULTS_QUERY = "(max-width: 640px)";

type ReceiptWorkspaceResultsSectionProps = {
    availableBoards: BoardSummary[];
    boardsError: string | null;
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
    extractedItemCount: number;
    isAuthenticated: boolean;
    isBoardsLoading: boolean;
    isSaving: boolean;
    locale: AppLocale;
    previewKind: ReceiptUploadKind | null;
    previewPlaceholderText: string;
    previewUrl: string | null;
    result: ExtractionResponse | null;
    saveMessage: string | null;
    selectedBoardId: string;
    translations: WorkspaceTranslations;
    onAddManualItem: () => void;
    onBoardChange: (boardId: string) => void;
    onEditItem: (index: number) => void;
    onRemoveManualItem: (index: number) => void;
    onSaveGroceries: () => void;
};

export const ReceiptWorkspaceResultsSection = ({
    availableBoards,
    boardsError,
    correctedCount,
    currencyFormatter,
    dashboardHref,
    displayedItems,
    displayedFileName,
    displayedTotal,
    editedItems,
    extractedItemCount,
    isAuthenticated,
    isBoardsLoading,
    isSaving,
    locale,
    previewKind,
    previewPlaceholderText,
    previewUrl,
    result,
    saveMessage,
    selectedBoardId,
    translations,
    onAddManualItem,
    onBoardChange,
    onEditItem,
    onRemoveManualItem,
    onSaveGroceries,
}: ReceiptWorkspaceResultsSectionProps) => {
    const [isCompactResults, setIsCompactResults] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const mediaQuery = window.matchMedia(COMPACT_RESULTS_QUERY);
        const updateCompactResults = (event?: MediaQueryListEvent) => {
            setIsCompactResults(event?.matches ?? mediaQuery.matches);
        };

        updateCompactResults();
        mediaQuery.addEventListener("change", updateCompactResults);

        return () => {
            mediaQuery.removeEventListener("change", updateCompactResults);
        };
    }, []);

    const dashboardPlaceholder = isBoardsLoading
        ? translations.receipt.loadingDashboards
        : availableBoards.length > 0
            ? translations.receipt.selectDashboard
            : translations.receipt.noDashboardsAvailable;

    return (
        <section className="mt-6 grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
            <Card className="min-w-0 gap-0 rounded-[24px] border-[var(--border)] py-0 shadow-[var(--shadow)] backdrop-blur-[16px]">
                <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-6 py-5 max-[640px]:flex-col max-[640px]:items-start max-[640px]:px-5 max-[640px]:py-4">
                    <h2 className="m-0 text-[1.4rem]">{translations.receipt.preview}</h2>
                    <span className="w-full break-all text-left text-sm leading-5 text-muted-foreground max-[640px]:text-xs">
                        {displayedFileName ?? translations.receipt.noFileSelected}
                    </span>
                </div>
                <CardContent className="p-6 max-[640px]:p-5">
                    {previewUrl && previewKind === "image" ? (
                        <Image
                            className="receipt-preview"
                            src={previewUrl}
                            alt={translations.receipt.previewAlt}
                            width={1200}
                            height={1600}
                            unoptimized
                        />
                    ) : previewUrl && previewKind === "pdf" ? (
                        <object
                            aria-label={translations.receipt.previewAlt}
                            className="min-h-[420px] w-full overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain-muted)]"
                            data={previewUrl}
                            type="application/pdf"
                        >
                            <div className="grid min-h-[240px] place-items-center p-6 text-center text-muted-foreground">
                                {displayedFileName ?? translations.receipt.previewAlt}
                            </div>
                        </object>
                    ) : (
                        <div className="grid min-h-[240px] place-items-center rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--surface-plain-muted)] p-6 text-center text-muted-foreground">
                            {previewPlaceholderText}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="min-w-0 gap-0 rounded-[24px] border-[var(--border)] py-0 shadow-[var(--shadow)] backdrop-blur-[16px]">
                <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-6 py-5 max-[640px]:flex-col max-[640px]:items-start max-[640px]:px-5 max-[640px]:py-4">
                    <h2 className="m-0 text-[1.4rem]">{translations.receipt.extractedItems}</h2>
                    <span className="text-sm text-muted-foreground max-[640px]:text-xs">
                        {result ? result.modelId : translations.receipt.waitingForExtraction}
                    </span>
                </div>
                <CardContent className="p-6 max-[640px]:p-5">
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
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-4 py-3 text-sm text-muted-foreground">
                                <span>{translations.receipt.reviewHint}</span>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="border-[var(--border)] bg-[var(--surface-plain)]"
                                    onClick={onAddManualItem}
                                >
                                    {translations.receipt.addManualItem}
                                </Button>
                            </div>
                            {isCompactResults ? (
                                <div className="grid gap-3">
                                    {displayedItems.map((entry, index) => {
                                        const isManualItem = index >= extractedItemCount;
                                        const manualIndex = index - extractedItemCount;

                                        return (
                                            <article
                                                key={`${entry.normalizedItem}-${entry.lineTotal}-${entry.quantity}-${index}`}
                                                className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain-soft)] p-4"
                                            >
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div className="grid min-w-0 gap-2">
                                                            <p className="m-0 break-words text-[1rem] font-semibold leading-6">
                                                                {entry.item}
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-2.5 py-1"
                                                                >
                                                                    {formatCategoryLabel(entry.category, translations.categories)}
                                                                </Badge>
                                                                {isManualItem ? (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-2.5 py-1"
                                                                    >
                                                                        {translations.receipt.alerts.manual}
                                                                    </Badge>
                                                                ) : null}
                                                                {!isManualItem && editedItems[index] ? (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="border-[rgba(181,82,51,0.24)] bg-[var(--surface-accent)] px-2.5 py-1 text-[var(--accent-dark)]"
                                                                    >
                                                                        {translations.receipt.alerts.corrected}
                                                                    </Badge>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <dl className="grid grid-cols-3 gap-3 rounded-[14px] bg-[var(--surface-plain)] px-3 py-3 text-sm max-[420px]:grid-cols-1">
                                                        <div className="grid gap-1">
                                                            <dt className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--accent-dark)]">
                                                                {translations.receipt.table.quantity}
                                                            </dt>
                                                            <dd className="m-0 font-semibold text-foreground">
                                                                {entry.quantity}
                                                            </dd>
                                                        </div>
                                                        <div className="grid gap-1">
                                                            <dt className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--accent-dark)]">
                                                                {translations.receipt.table.unit}
                                                            </dt>
                                                            <dd className="m-0 font-semibold text-foreground">
                                                                {currencyFormatter.format(entry.unitPrice)}
                                                            </dd>
                                                        </div>
                                                        <div className="grid gap-1">
                                                            <dt className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--accent-dark)]">
                                                                {translations.receipt.table.total}
                                                            </dt>
                                                            <dd className="m-0 font-semibold text-foreground">
                                                                {currencyFormatter.format(entry.lineTotal)}
                                                            </dd>
                                                        </div>
                                                    </dl>

                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            className="border-[var(--border)] bg-[var(--surface-plain)]"
                                                            onClick={() => onEditItem(index)}
                                                        >
                                                            {translations.receipt.alerts.adjust}
                                                        </Button>
                                                        {isManualItem ? (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onRemoveManualItem(manualIndex)}
                                                            >
                                                                {translations.receipt.alerts.remove}
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
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
                                        {displayedItems.map((entry, index) => {
                                            const isManualItem = index >= extractedItemCount;
                                            const manualIndex = index - extractedItemCount;

                                            return (
                                                <TableRow
                                                    key={`${entry.normalizedItem}-${entry.lineTotal}-${entry.quantity}-${index}`}
                                                >
                                                    <TableCell>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span>{entry.item}</span>
                                                            {isManualItem ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-2.5 py-1"
                                                                >
                                                                    {translations.receipt.alerts.manual}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>
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
                                                        {!isManualItem && editedItems[index] ? (
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
                                                        {isManualItem ? (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onRemoveManualItem(manualIndex)}
                                                            >
                                                                {translations.receipt.alerts.remove}
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}

                            <div className="mt-5 flex flex-wrap items-start justify-between gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-4 py-4 max-[640px]:px-3.5 max-[640px]:py-3.5">
                                <div className="grid min-w-[220px] flex-1 gap-1 max-[640px]:min-w-0">
                                    <p className="m-0 text-[0.95rem] font-semibold">
                                        {translations.receipt.saveCardTitle}
                                    </p>
                                    <p className="m-0 text-sm text-muted-foreground">
                                        {isAuthenticated
                                            ? translations.receipt.saveSignedIn
                                            : translations.receipt.saveSignedOut}
                                    </p>
                                </div>
                                <div className="grid w-[240px] gap-2 max-[640px]:order-first max-[640px]:w-full">
                                    <span className="text-[0.92rem] font-bold text-[var(--accent-dark)]">
                                        {translations.receipt.selectDashboard}
                                    </span>
                                    <Select
                                        value={selectedBoardId}
                                        onValueChange={onBoardChange}
                                        disabled={!isAuthenticated || isSaving || isBoardsLoading || availableBoards.length === 0}
                                    >
                                        <SelectTrigger className="w-full rounded-[14px] border-[var(--border)] bg-[var(--surface-plain)]">
                                            <SelectValue placeholder={dashboardPlaceholder} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableBoards.map((board) => (
                                                <SelectItem key={board.id} value={board.id}>
                                                    {board.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {boardsError ? (
                                        <p className="m-0 text-sm text-destructive">{boardsError}</p>
                                    ) : null}
                                </div>
                                <div className="flex w-full flex-wrap gap-2 min-[641px]:w-auto">
                                    <Button
                                        type="button"
                                        onClick={onSaveGroceries}
                                        className="max-[640px]:w-full"
                                        disabled={
                                            !isAuthenticated ||
                                            isSaving ||
                                            isBoardsLoading ||
                                            !selectedBoardId
                                        }
                                    >
                                        {isSaving
                                            ? translations.receipt.saving
                                            : translations.receipt.saveGroceries}
                                    </Button>
                                    <Button
                                        asChild
                                        variant="secondary"
                                        className="border-[var(--border)] bg-[var(--surface-plain)] max-[640px]:w-full"
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