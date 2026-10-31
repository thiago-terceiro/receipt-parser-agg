"use client";

import { memo, useEffect, useState, type ChangeEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Messages } from "@/lib/i18n/messages";
import {
    formatCategoryLabel,
    groceryCategories,
    parsePositiveDecimal,
    sanitizeCategory,
    type ReceiptItem,
} from "@/lib/receipt";

export type EditorState = {
    mode: "adjust" | "add-manual" | "edit-manual";
    index: number | null;
    itemName: string;
    category: string;
    quantity: string;
    unitPrice: string;
    error: string | null;
};

export type EditorFormValues = {
    itemName: string;
    category: string;
    quantity: number;
    unitPrice: number;
};

type WorkspaceTranslations = Pick<Messages, "categories" | "common" | "receipt">;

type ReceiptItemEditorDialogProps = {
    currencyFormatter: Intl.NumberFormat;
    editorState: EditorState | null;
    hasCorrection: boolean;
    item: ReceiptItem | null;
    translations: WorkspaceTranslations;
    onApply: (values?: EditorFormValues) => void;
    onCategoryChange?: (category: string) => void;
    onClose: () => void;
    onItemNameChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    onQuantityChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    onReset: () => void;
    onUnitPriceChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const ReceiptItemEditorDialog = memo(({
    currencyFormatter: _currencyFormatter,
    editorState,
    hasCorrection,
    item,
    translations,
    onApply,
    onCategoryChange,
    onClose,
    onItemNameChange,
    onQuantityChange,
    onReset,
    onUnitPriceChange,
}: ReceiptItemEditorDialogProps) => {
    const [localItemName, setLocalItemName] = useState(editorState?.itemName ?? "");
    const [localCategory, setLocalCategory] = useState(editorState?.category ?? "");
    const [localQuantity, setLocalQuantity] = useState(editorState?.quantity ?? "");
    const [localUnitPrice, setLocalUnitPrice] = useState(editorState?.unitPrice ?? "");
    const [localError, setLocalError] = useState<string | null>(editorState?.error ?? null);

    // Synchronize local form buffer when editorState opens or targets a new item
    useEffect(() => {
        if (editorState) {
            setLocalItemName(editorState.itemName);
            setLocalCategory(editorState.category);
            setLocalQuantity(editorState.quantity);
            setLocalUnitPrice(editorState.unitPrice);
            setLocalError(editorState.error ?? null);
        }
    }, [editorState]);

    const isManualEditor = editorState?.mode !== "adjust";
    const actionLabel = editorState?.mode === "add-manual"
        ? translations.receipt.editor.addManual
        : editorState?.mode === "edit-manual"
            ? translations.receipt.editor.saveManual
            : translations.receipt.editor.apply;

    const handleItemNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        setLocalItemName(e.target.value);
        setLocalError(null);
        onItemNameChange?.(e);
    };

    const handleCategoryChange = (val: string) => {
        setLocalCategory(val);
        setLocalError(null);
        onCategoryChange?.(val);
    };

    const handleQuantityChange = (e: ChangeEvent<HTMLInputElement>) => {
        setLocalQuantity(e.target.value);
        setLocalError(null);
        onQuantityChange?.(e);
    };

    const handleUnitPriceChange = (e: ChangeEvent<HTMLInputElement>) => {
        setLocalUnitPrice(e.target.value);
        setLocalError(null);
        onUnitPriceChange?.(e);
    };

    const handleApply = () => {
        const trimmedItemName = localItemName.trim();
        if (!trimmedItemName) {
            setLocalError(translations.receipt.errors.invalidItemName);
            return;
        }

        const sanitizedCat = sanitizeCategory(localCategory);
        if (!sanitizedCat) {
            setLocalError(translations.receipt.errors.invalidCategory);
            return;
        }

        const parsedQty = parsePositiveDecimal(localQuantity);
        if (parsedQty === null) {
            setLocalError(translations.receipt.errors.invalidQuantity);
            return;
        }

        const parsedPrice = parsePositiveDecimal(localUnitPrice);
        if (parsedPrice === null) {
            setLocalError(translations.receipt.errors.invalidUnitPrice);
            return;
        }

        onApply({
            itemName: trimmedItemName,
            category: sanitizedCat,
            quantity: parsedQty,
            unitPrice: parsedPrice,
        });
    };

    return (
        <Dialog open={editorState !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                {editorState && (isManualEditor || item) ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                {isManualEditor
                                    ? translations.receipt.editor.manualTitle
                                    : translations.receipt.editor.title}
                            </DialogTitle>
                            <DialogDescription>
                                {isManualEditor
                                    ? translations.receipt.editor.manualDescription
                                    : translations.receipt.editor.description}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 grid gap-4">
                            <div className="grid gap-2">
                                <label
                                    htmlFor="receipt-editor-item-name"
                                    className="text-[0.82rem] font-bold tracking-wide uppercase text-muted-foreground"
                                >
                                    {translations.receipt.editor.item}
                                </label>
                                <input
                                    id="receipt-editor-item-name"
                                    type="text"
                                    value={localItemName}
                                    onChange={handleItemNameChange}
                                    className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none ring-0 transition-colors focus:border-[var(--primary)]"
                                />
                            </div>

                            <div className="grid gap-2">
                                <span className="text-[0.82rem] font-bold tracking-wide uppercase text-muted-foreground">
                                    {translations.receipt.editor.category}
                                </span>
                                <Select value={localCategory} onValueChange={handleCategoryChange}>
                                    <SelectTrigger
                                        className="w-full rounded-[14px] border-[var(--border)] bg-[var(--surface-plain)] h-11 text-sm shadow-2xs hover:bg-[var(--surface-plain-soft)]"
                                        aria-label={translations.receipt.editor.category}
                                    >
                                        <SelectValue
                                            placeholder={translations.receipt.editor.selectCategory}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {groceryCategories.map((category) => (
                                             <SelectItem key={category} value={category}>
                                                {formatCategoryLabel(category, translations.categories)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <label
                                    htmlFor="receipt-editor-quantity"
                                    className="text-[0.82rem] font-bold tracking-wide uppercase text-muted-foreground"
                                >
                                    {translations.receipt.editor.quantity}
                                </label>
                                <input
                                    id="receipt-editor-quantity"
                                    type="number"
                                    inputMode="decimal"
                                    min="0.01"
                                    step="0.01"
                                    value={localQuantity}
                                    onChange={handleQuantityChange}
                                    className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none ring-0 transition-colors focus:border-[var(--primary)]"
                                />
                            </div>

                            <div className="grid gap-2">
                                <label
                                    htmlFor="receipt-editor-unit-price"
                                    className="text-[0.82rem] font-bold tracking-wide uppercase text-muted-foreground"
                                >
                                    {translations.receipt.editor.unitPrice}
                                </label>
                                <input
                                    id="receipt-editor-unit-price"
                                    type="number"
                                    inputMode="decimal"
                                    min="0.01"
                                    step="0.01"
                                    value={localUnitPrice}
                                    onChange={handleUnitPriceChange}
                                    className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none ring-0 transition-colors focus:border-[var(--primary)]"
                                />
                            </div>

                            {localError ? (
                                <Alert variant="destructive">
                                    <AlertDescription>{localError}</AlertDescription>
                                </Alert>
                            ) : null}

                            <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                                {!isManualEditor && hasCorrection ? (
                                    <Button type="button" variant="ghost" className="rounded-full h-10 px-4" onClick={onReset}>
                                        {translations.receipt.editor.reset}
                                    </Button>
                                ) : null}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="border-[var(--border)] bg-[var(--surface-plain)] rounded-full h-10 px-4 shadow-2xs hover:bg-[var(--surface-plain-soft)]"
                                    onClick={onClose}
                                >
                                    {translations.common.cancel}
                                </Button>
                                <Button type="button" className="rounded-full h-10 px-5 font-semibold" onClick={handleApply}>
                                    {actionLabel}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
});

ReceiptItemEditorDialog.displayName = "ReceiptItemEditorDialog";
