"use client";

import { Check, FileText, Loader2, UploadCloud, X } from "lucide-react";
import {
    type ChangeEvent,
    type DragEvent,
    type FormEvent,
    type KeyboardEvent,
    type RefObject,
} from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Messages } from "@/lib/i18n/messages";
import type { AvailableModel } from "@/lib/receipt";
import { receiptUploadAccept } from "@/lib/receipt-upload";

type WorkspaceTranslations = Pick<Messages, "receipt">;

type ReceiptWorkspaceUploadSectionProps = {
    availableModels: AvailableModel[];
    canSubmit: boolean;
    error: string | null;
    fileInputRef: RefObject<HTMLInputElement | null>;
    hasSelectedFile: boolean;
    isDraggingFile: boolean;
    isLoading: boolean;
    saveMessage: string | null;
    selectedModelId: string;
    selectedFileName: string | null;
    selectedFileSize: number | null;
    translations: WorkspaceTranslations;
    onClearSelectedFile: () => void;
    onDropzoneClick: () => void;
    onDropzoneDragLeave: (event: DragEvent<HTMLDivElement>) => void;
    onDropzoneDragOver: (event: DragEvent<HTMLDivElement>) => void;
    onDropzoneDrop: (event: DragEvent<HTMLDivElement>) => void;
    onDropzoneKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onModelChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export const ReceiptWorkspaceUploadSection = ({
    availableModels,
    canSubmit,
    error,
    fileInputRef,
    hasSelectedFile,
    isDraggingFile,
    isLoading,
    saveMessage,
    selectedModelId,
    selectedFileName,
    selectedFileSize,
    translations,
    onClearSelectedFile,
    onDropzoneClick,
    onDropzoneDragLeave,
    onDropzoneDragOver,
    onDropzoneDrop,
    onDropzoneKeyDown,
    onFileChange,
    onModelChange,
    onSubmit,
}: ReceiptWorkspaceUploadSectionProps) => {
    return (
        <section className="grid gap-6 rounded-[28px] border border-[var(--border)] bg-card p-7 shadow-[var(--shadow)] backdrop-blur-[16px] [grid-template-columns:1.2fr_0.8fr] max-[900px]:[grid-template-columns:1fr]">
            <div className="min-w-0 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(181,82,51,0.2)] bg-[var(--surface-plain-soft)] px-3 py-1 text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-dark)] shadow-xs">
                        <span className="size-1.5 rounded-full bg-[var(--primary)] animate-pulse" aria-hidden="true" />
                        {translations.receipt.eyebrow}
                    </span>
                </div>
                <h1 className="m-0 text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.04em] text-balance">
                    {translations.receipt.heroTitle}
                </h1>
                <p className="max-w-[54ch] text-[1.02rem] leading-[1.7] text-muted-foreground">
                    {translations.receipt.heroDescription}
                </p>
            </div>

            <form
                className="min-w-0 flex flex-col gap-3.5 rounded-[22px] border border-[rgba(181,82,51,0.16)] bg-[var(--surface-strong)] p-5"
                onSubmit={onSubmit}
            >
                <input
                    id="receipt-file"
                    name="receipt-file"
                    type="file"
                    accept={receiptUploadAccept}
                    ref={fileInputRef}
                    onChange={onFileChange}
                    className="sr-only"
                />

                <div
                    role="button"
                    tabIndex={0}
                    aria-label={hasSelectedFile ? `${translations.receipt.fileReady}: ${selectedFileName ?? ""}` : translations.receipt.dropImage}
                    onClick={onDropzoneClick}
                    onKeyDown={onDropzoneKeyDown}
                    onDragOver={onDropzoneDragOver}
                    onDragLeave={onDropzoneDragLeave}
                    onDrop={onDropzoneDrop}
                    className={[
                        "group file-dropzone-bg grid min-h-[220px] w-full content-center gap-3 rounded-[18px] border-[1.5px] border-dashed p-5 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] hover:border-[var(--primary)] hover:bg-[var(--surface-plain-soft)] hover:shadow-xs",
                        isDraggingFile
                            ? "scale-[1.01] border-[var(--accent)] bg-[var(--surface-selected)] shadow-[0_0_0_4px_var(--focus-surface)]"
                            : "border-[rgba(181,82,51,0.42)]",
                    ].join(" ")}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                            <div className="inline-grid size-11 place-items-center rounded-2xl border border-[rgba(181,82,51,0.18)] bg-[var(--surface-plain-soft)] text-[var(--accent-dark)] shadow-xs transition-transform duration-200 group-hover:scale-105 group-hover:-translate-y-0.5">
                                {hasSelectedFile ? (
                                    <FileText className="size-5.5" aria-hidden="true" />
                                ) : (
                                    <UploadCloud className="size-5.5" aria-hidden="true" />
                                )}
                            </div>
                            <div className="grid gap-1">
                                <span className="text-[1.12rem] font-bold">
                                    {hasSelectedFile
                                        ? translations.receipt.fileReady
                                        : translations.receipt.dropImage}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {hasSelectedFile
                                        ? translations.receipt.replaceHelp
                                        : translations.receipt.browseHelp}
                                </span>
                            </div>
                        </div>
                    </div>

                    {hasSelectedFile ? (
                        <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-plain-soft)] px-4 py-3 shadow-xs">
                            <div className="flex min-w-0 items-center gap-3 flex-1">
                                <div className="inline-grid size-8 shrink-0 place-items-center rounded-xl bg-[rgba(181,82,51,0.12)] text-[var(--accent-dark)]">
                                    <FileText className="size-4" aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {selectedFileName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedFileSize != null
                                            ? `${(selectedFileSize / 1024 / 1024).toFixed(2)} MB`
                                            : null}
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onClearSelectedFile();
                                }}
                                disabled={isLoading}
                                aria-label={translations.receipt.removeSelectedImage}
                            >
                                <X className="size-4" aria-hidden="true" />
                            </Button>
                        </div>
                    ) : (
                        <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                            <span className="font-semibold text-foreground">{translations.receipt.dragAndDrop}</span>{" "}
                            <span>{translations.receipt.clickToBrowse}</span>
                        </p>
                    )}
                </div>

                <div className="grid gap-2">
                    <span className="text-[0.92rem] font-bold text-[var(--accent-dark)]">
                        {translations.receipt.modelLabel}
                    </span>
                    <Select
                        value={selectedModelId}
                        onValueChange={onModelChange}
                        disabled={isLoading || availableModels.length === 0}
                    >
                        <SelectTrigger
                            className="w-full rounded-[14px] border-[var(--border)] bg-[var(--surface-plain)]"
                            aria-label={translations.receipt.modelLabel}
                        >
                            <SelectValue placeholder={translations.receipt.selectModel} />
                        </SelectTrigger>
                        <SelectContent>
                            {availableModels.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                    {model.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-3 max-[500px]:grid-cols-1">
                    <Button
                        type="submit"
                        disabled={!canSubmit || isLoading}
                        className="w-full transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98] shadow-xs hover:shadow-md"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
                                {translations.receipt.extracting}
                            </>
                        ) : (
                            translations.receipt.extractReceipt
                        )}
                    </Button>
                    <Button
                        variant="secondary"
                        type="button"
                        onClick={onClearSelectedFile}
                        disabled={!hasSelectedFile || isLoading}
                        className="w-full transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                        {translations.receipt.removeImage}
                    </Button>
                </div>

                {error ? (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : null}

                {saveMessage ? (
                    <Alert>
                        <Check className="size-4" aria-hidden="true" />
                        <AlertDescription>{saveMessage}</AlertDescription>
                    </Alert>
                ) : null}
            </form>
        </section>
    );
};