"use client";

import { Check, FileImage, Upload, X } from "lucide-react";
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

type WorkspaceTranslations = Pick<Messages, "receipt">;

type ReceiptWorkspaceUploadSectionProps = {
    availableModels: AvailableModel[];
    error: string | null;
    file: File | null;
    fileInputRef: RefObject<HTMLInputElement | null>;
    isDraggingFile: boolean;
    isLoading: boolean;
    saveMessage: string | null;
    selectedModelId: string;
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
    error,
    file,
    fileInputRef,
    isDraggingFile,
    isLoading,
    saveMessage,
    selectedModelId,
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
            <div className="flex flex-col gap-3">
                <p className="m-0 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--accent-dark)]">
                    {translations.receipt.eyebrow}
                </p>
                <h1 className="m-0 text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.04em] text-balance">
                    {translations.receipt.heroTitle}
                </h1>
                <p className="max-w-[54ch] text-[1.02rem] leading-[1.7] text-muted-foreground">
                    {translations.receipt.heroDescription}
                </p>
            </div>

            <form
                className="flex flex-col gap-3.5 rounded-[22px] border border-[rgba(181,82,51,0.16)] bg-[var(--surface-strong)] p-5"
                onSubmit={onSubmit}
            >
                <input
                    id="receipt-file"
                    name="receipt-file"
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    className="sr-only"
                />

                <div
                    role="button"
                    tabIndex={0}
                    onClick={onDropzoneClick}
                    onKeyDown={onDropzoneKeyDown}
                    onDragOver={onDropzoneDragOver}
                    onDragLeave={onDropzoneDragLeave}
                    onDrop={onDropzoneDrop}
                    className={[
                        "file-dropzone-bg grid min-h-[220px] w-full content-center gap-3 rounded-[18px] border-[1.5px] border-dashed p-5 text-left transition-all duration-150",
                        isDraggingFile
                            ? "border-[var(--accent)] bg-[var(--surface-selected)] shadow-[0_0_0_4px_var(--focus-surface)]"
                            : "border-[rgba(181,82,51,0.42)]",
                    ].join(" ")}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="grid size-12 place-items-center rounded-full bg-[var(--surface-plain-soft)] text-[var(--accent-dark)] shadow-sm">
                                {file ? <FileImage className="size-5" /> : <Upload className="size-5" />}
                            </div>
                            <div className="grid gap-1">
                                <span className="text-[1.15rem] font-bold">
                                    {file
                                        ? translations.receipt.fileReady
                                        : translations.receipt.dropImage}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {file
                                        ? translations.receipt.replaceHelp
                                        : translations.receipt.browseHelp}
                                </span>
                            </div>
                        </div>
                    </div>

                    {file ? (
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-plain-soft)] px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                    {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onClearSelectedFile();
                                }}
                                disabled={isLoading}
                                aria-label={translations.receipt.removeSelectedImage}
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{translations.receipt.dragAndDrop}</span>
                            <span>{translations.receipt.clickToBrowse}</span>
                        </div>
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
                        <SelectTrigger className="w-full rounded-[14px] border-[var(--border)] bg-[var(--surface-plain)]">
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

                <p className="text-[0.9rem] leading-[1.5] text-muted-foreground">
                    {translations.receipt.modelHelp}
                </p>

                <div className="grid grid-cols-2 gap-3 max-[500px]:grid-cols-1">
                    <Button type="submit" disabled={!file || isLoading} className="w-full">
                        {isLoading
                            ? translations.receipt.extracting
                            : translations.receipt.extractReceipt}
                    </Button>
                    <Button
                        variant="secondary"
                        type="button"
                        onClick={onClearSelectedFile}
                        disabled={!file || isLoading}
                        className="w-full"
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
                        <Check className="size-4" />
                        <AlertDescription>{saveMessage}</AlertDescription>
                    </Alert>
                ) : null}
            </form>
        </section>
    );
};