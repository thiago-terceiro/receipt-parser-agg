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
    index: number;
    category: string;
    quantity: string;
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
    onQuantityChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onReset: () => void;
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
    onQuantityChange,
    onReset,
}: ReceiptItemEditorDialogProps) => {
    return (
        <Dialog open={editorState !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                {item ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>{translations.receipt.editor.title}</DialogTitle>
                            <DialogDescription>
                                {translations.receipt.editor.description}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 grid gap-4">
                            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-plain-soft)] px-4 py-3">
                                <p className="m-0 text-[0.76rem] uppercase tracking-[0.18em] text-[var(--accent-dark)]">
                                    {translations.receipt.editor.item}
                                </p>
                                <p className="m-0 mt-2 text-[1.05rem] font-semibold text-foreground">
                                    {item.item}
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <span className="text-[0.92rem] font-bold text-[var(--accent-dark)]">
                                    {translations.receipt.editor.category}
                                </span>
                                <Select value={editorState?.category ?? ""} onValueChange={onCategoryChange}>
                                    <SelectTrigger className="w-full rounded-[14px] border-[var(--border)] bg-[var(--surface-plain)]">
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
                                <span className="text-[0.92rem] font-bold text-[var(--accent-dark)]">
                                    {translations.receipt.editor.quantity}
                                </span>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0.01"
                                    step="0.01"
                                    value={editorState?.quantity ?? ""}
                                    onChange={onQuantityChange}
                                    className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none ring-0 transition-colors focus:border-[var(--accent)]"
                                />
                            </div>

                            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-4 py-3 text-sm text-muted-foreground">
                                {translations.receipt.editor.unitPriceFixed(
                                    currencyFormatter.format(item.unitPrice),
                                )}
                            </div>

                            {editorState?.error ? (
                                <Alert variant="destructive">
                                    <AlertDescription>{editorState.error}</AlertDescription>
                                </Alert>
                            ) : null}

                            <div className="flex flex-wrap justify-end gap-2">
                                {hasCorrection ? (
                                    <Button type="button" variant="ghost" onClick={onReset}>
                                        {translations.receipt.editor.reset}
                                    </Button>
                                ) : null}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="border-[var(--border)] bg-[var(--surface-plain)]"
                                    onClick={onClose}
                                >
                                    {translations.common.cancel}
                                </Button>
                                <Button type="button" onClick={onApply}>
                                    {translations.receipt.editor.apply}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
};