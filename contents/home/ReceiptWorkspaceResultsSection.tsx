"use client";

import { Check, ChevronDown, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import { memo, useEffect, useRef, useState } from "react";

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
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { AppLocale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { formatCategoryLabel, type ReceiptItem } from "@/lib/receipt";
import type { ReceiptUploadKind } from "@/lib/receipt-upload";
import { cn } from "@/lib/utils";

type WorkspaceTranslations = Pick<Messages, "categories" | "common" | "receipt">;


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
    isLoading?: boolean;
    isSaving: boolean;
    locale: AppLocale;
    previewKind: ReceiptUploadKind | null;
    previewPlaceholderText: string;
    previewUrl: string | null;
    purchaseDate?: string;
    result: ExtractionResponse | null;
    saveMessage: string | null;
    selectedBoardId: string;
    translations: WorkspaceTranslations;
    onAddManualItem: () => void;
    onBoardChange: (boardId: string) => void;
    onCurrencyChange?: (currencyCode: string) => void;
    onEditItem: (index: number) => void;
    onPurchaseDateChange?: (date: string) => void;
    onRemoveItem?: (index: number) => void;
    onRemoveManualItem?: (index: number) => void;
    onSaveGroceries: () => void;
};

export const ReceiptWorkspaceResultsSection = memo(({
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
    isLoading = false,
    isSaving,
    locale,
    previewKind,
    previewPlaceholderText,
    previewUrl,
    purchaseDate,
    result,
    saveMessage,
    selectedBoardId,
    translations,
    onAddManualItem,
    onBoardChange,
    onCurrencyChange,
    onEditItem,
    onPurchaseDateChange,
    onRemoveItem,
    onRemoveManualItem,
    onSaveGroceries,
}: ReceiptWorkspaceResultsSectionProps) => {
    const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
    const currencyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isCurrencyOpen) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
                setIsCurrencyOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsCurrencyOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isCurrencyOpen]);

    const currencies = result
        ? (SUPPORTED_CURRENCIES as readonly string[]).includes(result.currencyCode)
            ? (SUPPORTED_CURRENCIES as readonly string[])
            : [result.currencyCode, ...(SUPPORTED_CURRENCIES as readonly string[])]
        : (SUPPORTED_CURRENCIES as readonly string[]);

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
                        <div className="relative overflow-hidden rounded-[18px]">
                            <Image
                                className="receipt-preview block"
                                src={previewUrl}
                                alt={translations.receipt.previewAlt}
                                width={1200}
                                height={1600}
                                unoptimized
                            />
                            {isLoading ? (
                                <>
                                    <div className="receipt-scan-overlay" aria-hidden="true" />
                                    <div className="receipt-scan-laser" aria-hidden="true" />
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-plain)] px-3.5 py-1.5 shadow-lg backdrop-blur-md">
                                        <span className="relative flex size-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-75" />
                                            <span className="relative inline-flex size-2 rounded-full bg-[var(--primary)]" />
                                        </span>
                                        <span className="text-xs font-semibold tracking-wide text-foreground">
                                            {translations.receipt.extracting}
                                        </span>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    ) : previewUrl && previewKind === "pdf" ? (
                        <div className="relative overflow-hidden rounded-[18px]">
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
                            {isLoading ? (
                                <>
                                    <div className="receipt-scan-overlay" aria-hidden="true" />
                                    <div className="receipt-scan-laser" aria-hidden="true" />
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-plain)] px-3.5 py-1.5 shadow-lg backdrop-blur-md">
                                        <span className="relative flex size-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-75" />
                                            <span className="relative inline-flex size-2 rounded-full bg-[var(--primary)]" />
                                        </span>
                                        <span className="text-xs font-semibold tracking-wide text-foreground">
                                            {translations.receipt.extracting}
                                        </span>
                                    </div>
                                </>
                            ) : null}
                        </div>
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
                                <div className="flex flex-wrap items-center gap-2">
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
                                    {onCurrencyChange ? (
                                        <div ref={currencyRef} className="relative inline-block">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                aria-label="Change currency"
                                                aria-expanded={isCurrencyOpen}
                                                aria-haspopup="listbox"
                                                onClick={() => setIsCurrencyOpen((prev) => !prev)}
                                                className="h-6 gap-1 rounded-full border-[var(--border)] bg-[var(--surface-plain-soft)] px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-[var(--surface-plain)]"
                                            >
                                                <span>{result.currencyCode}</span>
                                                <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
                                            </Button>
                                            {isCurrencyOpen ? (
                                                <div
                                                    role="listbox"
                                                    aria-label="Supported currencies"
                                                    className="absolute right-0 top-full z-50 mt-1 max-h-48 min-w-[90px] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-plain)] p-1 shadow-md backdrop-blur-md"
                                                >
                                                    {currencies.map((code) => (
                                                        <button
                                                            key={code}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={code === result.currencyCode}
                                                            onClick={() => {
                                                                onCurrencyChange(code);
                                                                setIsCurrencyOpen(false);
                                                            }}
                                                            className={cn(
                                                                "flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-[var(--surface-accent)] hover:text-[var(--accent-dark)]",
                                                                code === result.currencyCode
                                                                    ? "bg-[var(--surface-plain-soft)] font-semibold text-foreground"
                                                                    : "text-muted-foreground",
                                                            )}
                                                        >
                                                            <span>{code}</span>
                                                            {code === result.currencyCode ? (
                                                                <Check className="size-3 text-[var(--accent-dark)]" aria-hidden="true" />
                                                            ) : null}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                    {correctedCount > 0 ? (
                                        <Badge
                                            variant="outline"
                                            className="border-blue-500/25 bg-blue-500/10 px-3 py-1 text-blue-700 dark:text-blue-300 font-semibold"
                                        >
                                            {translations.receipt.corrected(correctedCount)}
                                        </Badge>
                                    ) : null}
                                </div>
                            </div>
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-4 py-3 text-sm text-muted-foreground backdrop-blur-md">
                                <span>{translations.receipt.reviewHint}</span>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="border-[var(--border)] bg-[var(--surface-plain)] rounded-full shadow-2xs hover:bg-[var(--surface-plain-soft)]"
                                    onClick={onAddManualItem}
                                >
                                    {translations.receipt.addManualItem}
                                </Button>
                            </div>
                            <div className="grid gap-3 sm:hidden">
                                {displayedItems.map((entry, index) => {
                                    const isManualItem = index >= extractedItemCount;
                                    const manualIndex = index - extractedItemCount;

                                    return (
                                        <article
                                            key={`mobile-${entry.normalizedItem}-${entry.lineTotal}-${entry.quantity}-${index}`}
                                            className="group rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain-soft)] p-4 transition-all duration-200 hover:border-[var(--primary)] hover:shadow-sm"
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
                                                                    className="border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-blue-700 dark:text-blue-300 font-semibold"
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
                                                    {onRemoveItem || isManualItem ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (onRemoveItem) {
                                                                    onRemoveItem(index);
                                                                } else if (onRemoveManualItem) {
                                                                    onRemoveManualItem(manualIndex);
                                                                }
                                                            }}
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
                            <Table className="hidden sm:table" aria-label={translations.receipt.extractedItems}>
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
                                                    className="transition-colors duration-150 hover:bg-[var(--surface-plain-soft)]"
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
                                                                className="border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-blue-700 dark:text-blue-300 font-semibold"
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
                                                        {onRemoveItem || isManualItem ? (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (onRemoveItem) {
                                                                        onRemoveItem(index);
                                                                    } else if (onRemoveManualItem) {
                                                                        onRemoveManualItem(manualIndex);
                                                                    }
                                                                }}
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
                                <div className="grid w-[180px] gap-2 max-[640px]:w-full">
                                    <label htmlFor="receipt-purchase-date" className="text-[0.82rem] font-bold tracking-wide uppercase text-muted-foreground">
                                        {translations.receipt.purchaseDate}
                                    </label>
                                    <input
                                        id="receipt-purchase-date"
                                        type="date"
                                        value={purchaseDate ?? ""}
                                        onChange={(event) => onPurchaseDateChange?.(event.target.value)}
                                        disabled={isSaving}
                                        className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-sm text-foreground outline-none ring-0 transition-colors focus:border-[var(--primary)] disabled:opacity-50"
                                    />
                                </div>
                                <div className="grid w-[240px] gap-2 max-[640px]:order-first max-[640px]:w-full">
                                    <span className="text-[0.82rem] font-bold tracking-wide uppercase text-muted-foreground">
                                        {translations.receipt.selectDashboard}
                                    </span>
                                    <Select
                                        value={selectedBoardId}
                                        onValueChange={onBoardChange}
                                        disabled={!isAuthenticated || isSaving || isBoardsLoading || availableBoards.length === 0}
                                    >
                                        <SelectTrigger
                                            className="w-full rounded-[14px] border-[var(--border)] bg-[var(--surface-plain)] h-11 text-sm shadow-2xs hover:bg-[var(--surface-plain-soft)]"
                                            aria-label={translations.receipt.selectDashboard}
                                        >
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
                                        <p role="alert" className="m-0 text-sm text-destructive">{boardsError}</p>
                                    ) : null}
                                </div>
                                <div className="flex w-full flex-wrap gap-2.5 min-[641px]:w-auto items-end">
                                    <Button
                                        type="button"
                                        onClick={onSaveGroceries}
                                        className="max-[640px]:w-full h-11 rounded-full px-5 font-semibold shadow-xs hover:shadow-md"
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
                                        className="border-[var(--border)] bg-[var(--surface-plain)] shadow-2xs hover:bg-[var(--surface-plain-soft)] hover:border-blue-500/30 max-[640px]:w-full h-11 rounded-full px-5 font-semibold"
                                    >
                                        <Link href={dashboardHref} locale={locale}>
                                            <LayoutDashboard className="size-4" aria-hidden="true" />
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
});

ReceiptWorkspaceResultsSection.displayName = "ReceiptWorkspaceResultsSection";