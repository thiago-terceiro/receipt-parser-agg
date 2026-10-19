"use client";

import { type ChangeEvent } from "react";

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

type WorkspaceTranslations = Pick<Messages, "categories" | "common" | "receipt">;

type ReceiptItemEditorDialogProps = {
    currencyFormatter: Intl.NumberFormat;
    editorState: EditorState | null;
    hasCorrection: boolean;
    item: ReceiptItem | null;
    translations: WorkspaceTranslations;
    onApply: () => void;
    onCategoryChange: (category: string) => void;
    onClose: () => void;
    onItemNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onQuantityChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onReset: () => void;
    onUnitPriceChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const ReceiptItemEditorDialog = ({
    currencyFormatter,
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
    const isManualEditor = editorState?.mode !== "adjust";
    const actionLabel = editorState?.mode === "add-manual"
        ? translations.receipt.editor.addManual
        : editorState?.mode === "edit-manual"
            ? translations.receipt.editor.saveManual
            : translations.receipt.editor.apply;

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
                            {isManualEditor ? (
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
                                        value={editorState.itemName}
                                        onChange={onItemNameChange}
                                        className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none ring-0 transition-colors focus:border-[var(--primary)]"
                                    />
                                </div>
                            ) : item ? (
                                <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-4 py-3">
                                    <p className="m-0 text-[0.76rem] uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300 font-bold">
                                        {translations.receipt.editor.item}
                                    </p>
                                    <p className="m-0 mt-2 text-[1.05rem] font-semibold text-foreground">
                                        {item.item}
                                    </p>
                                </div>
                            ) : null}

                            <div className="grid gap-2">
                                <span className="text-[0.82rem] font-bold tracking-wide uppercase text-muted-foreground">
                                    {translations.receipt.editor.category}
                                </span>
                                <Select value={editorState?.category ?? ""} onValueChange={onCategoryChange}>
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
                                    value={editorState?.quantity ?? ""}
                                    onChange={onQuantityChange}
                                    className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none ring-0 transition-colors focus:border-[var(--primary)]"
                                />
                            </div>

                            {isManualEditor ? (
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
                                        value={editorState.unitPrice}
                                        onChange={onUnitPriceChange}
                                        className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none ring-0 transition-colors focus:border-[var(--primary)]"
                                    />
                                </div>
                            ) : item ? (
                                <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-4 py-3 text-sm text-muted-foreground">
                                    {translations.receipt.editor.unitPriceFixed(
                                        currencyFormatter.format(item.unitPrice),
                                    )}
                                </div>
                            ) : null}

                            {editorState?.error ? (
                                <Alert variant="destructive">
                                    <AlertDescription>{editorState.error}</AlertDescription>
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
                                <Button type="button" className="rounded-full h-10 px-5 font-semibold" onClick={onApply}>
                                    {actionLabel}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
};