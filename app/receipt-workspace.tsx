"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

import { Check, FileImage, LayoutDashboard, Upload, X } from "lucide-react";

import { useLocale, useTranslations } from "@/components/locale-provider";
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
import { formatMonthLabel } from "@/lib/groceries";
import { localizePath } from "@/lib/i18n/config";
import {
  formatCategoryLabel,
  groceryCategories,
  sanitizeCategory,
  type AvailableModel,
  type ReceiptItem,
} from "../lib/receipt";

type ExtractionResponse = {
  backend: string;
  modelId: string;
  items: ReceiptItem[];
  rawResponse: string;
};

type ReceiptWorkspaceProps = {
  availableModels: AvailableModel[];
  defaultModelId: string;
};

type EditorState = {
  index: number;
  category: string;
  quantity: string;
  error: string | null;
};

type SavedReceiptState = {
  month: string;
  receiptId: string;
};

const parseJsonResponse = async <T,>(response: Response): Promise<T> => {
  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error("The server returned an empty response.");
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    const snippet = responseText.replace(/\s+/g, " ").slice(0, 200);
    throw new Error(
      snippet
        ? `The server returned an invalid JSON response: ${snippet}`
        : "The server returned an invalid JSON response.",
    );
  }
};

export const ReceiptWorkspace = ({
  availableModels,
  defaultModelId,
}: ReceiptWorkspaceProps) => {
  const locale = useLocale();
  const translations = useTranslations();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(defaultModelId);
  const [result, setResult] = useState<ExtractionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<Record<number, ReceiptItem>>({});
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<SavedReceiptState | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const dashboardBaseHref = localizePath("/groceries", locale);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
      }),
    [locale],
  );

  const displayedItems = useMemo(
    () => result?.items.map((item, index) => editedItems[index] ?? item) ?? [],
    [editedItems, result],
  );
  const displayedTotal = useMemo(
    () => displayedItems.reduce((sum, entry) => sum + entry.lineTotal, 0),
    [displayedItems],
  );
  const correctedCount = Object.keys(editedItems).length;
  const editingItem = editorState ? displayedItems[editorState.index] ?? null : null;
  const dashboardHref = savedReceipt
    ? savedReceipt.month
      ? `${dashboardBaseHref}?month=${savedReceipt.month}&saved=${savedReceipt.receiptId}`
      : `${dashboardBaseHref}?saved=${savedReceipt.receiptId}`
    : dashboardBaseHref;

  useEffect(() => {
    setSelectedModelId(defaultModelId);
  }, [defaultModelId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetWorkspaceState = useCallback(() => {
    setResult(null);
    setError(null);
    setSaveMessage(null);
    setEditedItems({});
    setEditorState(null);
    setShowRawResponse(false);
    setSavedReceipt(null);
  }, []);

  const clearSelectedFile = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    setIsDraggingFile(false);
    resetWorkspaceState();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [resetWorkspaceState]);

  const applySelectedFile = useCallback((nextFile: File | null) => {
    if (!nextFile) {
      clearSelectedFile();
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setError(translations.receipt.errors.invalidImage);
      return;
    }

    setFile(nextFile);
    resetWorkspaceState();
    setPreviewUrl(URL.createObjectURL(nextFile));
  }, [clearSelectedFile, resetWorkspaceState, translations.receipt.errors.invalidImage]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    applySelectedFile(nextFile);
  }, [applySelectedFile]);

  const handleDropzoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDropzoneDragOver = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingFile(true);
  }, []);

  const handleDropzoneDragLeave = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsDraggingFile(false);
  }, []);

  const handleDropzoneDrop = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const nextFile = event.dataTransfer.files?.[0] ?? null;
    applySelectedFile(nextFile);
  }, [applySelectedFile]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError(translations.receipt.errors.noFile);
      return;
    }

    setIsLoading(true);
    resetWorkspaceState();

    const formData = new FormData();
    formData.append("file", file);
    if (selectedModelId) formData.append("modelId", selectedModelId);

    try {
      const response = await fetch("/api/extract", { method: "POST", body: formData });
      const payload = await parseJsonResponse<ExtractionResponse | { error?: string }>(response);
      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : translations.receipt.errors.extractionFailed,
        );
      }
      setResult(payload as ExtractionResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : translations.receipt.errors.unexpectedRequest,
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    file,
    resetWorkspaceState,
    selectedModelId,
    translations.receipt.errors.extractionFailed,
    translations.receipt.errors.noFile,
    translations.receipt.errors.unexpectedRequest,
  ]);

  const handleSaveGroceries = useCallback(async () => {
    if (!result || displayedItems.length === 0) {
      setError(translations.receipt.errors.noResultToSave);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: displayedItems,
          sourceFileName: file?.name ?? null,
          modelId: result.modelId,
        }),
      });

      const payload = await parseJsonResponse<{
        error?: string;
        savedCount?: number;
        month?: string;
        receiptId?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(payload.error || translations.receipt.errors.saveFailed);
      }

      const receiptId = payload.receiptId ?? String(Date.now());
      const savedMonth = payload.month ?? "";
      setSavedReceipt({ month: savedMonth, receiptId });

      const savedMonthLabel = savedMonth
        ? formatMonthLabel(savedMonth, locale)
        : formatMonthLabel(
            new Date().toISOString().slice(0, 7),
            locale,
          );
      setSaveMessage(
        translations.receipt.saveSuccess(
          payload.savedCount ?? displayedItems.length,
          savedMonthLabel,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : translations.receipt.errors.unexpectedSave,
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    displayedItems,
    file?.name,
    locale,
    result,
    translations.receipt.errors.noResultToSave,
    translations.receipt.errors.saveFailed,
    translations.receipt.errors.unexpectedSave,
    translations.receipt.saveSuccess,
  ]);

  const closeEditor = useCallback(() => {
    setEditorState(null);
  }, []);

  const openEditor = useCallback((index: number) => {
    const item = displayedItems[index];
    if (!item) {
      return;
    }

    setEditorState({
      index,
      category: item.category,
      quantity: String(item.quantity),
      error: null,
    });
  }, [displayedItems]);

  const applyCorrection = useCallback(() => {
    if (!editorState) {
      return;
    }

    const sourceItem = displayedItems[editorState.index];
    if (!sourceItem) {
      closeEditor();
      return;
    }

    const category = sanitizeCategory(editorState.category);
    const quantity = Number(editorState.quantity);

    if (!category) {
      setEditorState((current) =>
        current
          ? { ...current, error: translations.receipt.errors.invalidCategory }
          : current,
      );
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setEditorState((current) =>
        current
          ? { ...current, error: translations.receipt.errors.invalidQuantity }
          : current,
      );
      return;
    }

    const roundedQuantity = Number(quantity.toFixed(2));
    setEditedItems((current) => ({
      ...current,
      [editorState.index]: {
        ...sourceItem,
        category,
        quantity: roundedQuantity,
        lineTotal: Number((sourceItem.unitPrice * roundedQuantity).toFixed(2)),
      },
    }));
    closeEditor();
  }, [
    closeEditor,
    displayedItems,
    editorState,
    translations.receipt.errors.invalidCategory,
    translations.receipt.errors.invalidQuantity,
  ]);

  const resetCorrection = useCallback(() => {
    if (!editorState) {
      return;
    }

    setEditedItems((current) => {
      const next = { ...current };
      delete next[editorState.index];
      return next;
    });
    closeEditor();
  }, [closeEditor, editorState]);

  const toggleRawResponse = useCallback(() => {
    setShowRawResponse((current) => !current);
  }, []);

  return (
    <>
      <section className="grid gap-6 rounded-[28px] border border-[var(--border)] bg-card p-7 shadow-[var(--shadow)] backdrop-blur-[16px] [grid-template-columns:1.2fr_0.8fr] max-[900px]:[grid-template-columns:1fr]">
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--accent-dark)]">
            {translations.receipt.eyebrow}
          </p>
          <h1 className="m-0 text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.04em] text-balance">
            {translations.receipt.heroTitle}
          </h1>
          <p className="max-w-[54ch] text-muted-foreground text-[1.02rem] leading-[1.7]">
            {translations.receipt.heroDescription}
          </p>
        </div>

        <form
          className="flex flex-col gap-3.5 rounded-[22px] border border-[rgba(181,82,51,0.16)] bg-[var(--surface-strong)] p-5"
          onSubmit={handleSubmit}
        >
          <input
            id="receipt-file"
            name="receipt-file"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="sr-only"
          />

          <button
            type="button"
            onClick={handleDropzoneClick}
            onDragOver={handleDropzoneDragOver}
            onDragLeave={handleDropzoneDragLeave}
            onDrop={handleDropzoneDrop}
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
                    {file ? translations.receipt.fileReady : translations.receipt.dropImage}
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
                  <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
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
                    clearSelectedFile();
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
          </button>

          <div className="grid gap-2">
            <span className="text-[0.92rem] font-bold text-[var(--accent-dark)]">
              {translations.receipt.modelLabel}
            </span>
            <Select
              value={selectedModelId}
              onValueChange={(v) => setSelectedModelId(v)}
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

          <p className="text-muted-foreground text-[0.9rem] leading-[1.5]">
            {translations.receipt.modelHelp}
          </p>

          <div className="grid grid-cols-2 gap-3 max-[500px]:grid-cols-1">
            <Button type="submit" disabled={!file || isLoading} className="w-full">
              {isLoading ? translations.receipt.extracting : translations.receipt.extractReceipt}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={clearSelectedFile}
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

      <section className="mt-6 grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
        <Card className="gap-0 rounded-[24px] border-[var(--border)] py-0 shadow-[var(--shadow)] backdrop-blur-[16px]">
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
            <h2 className="m-0 text-[1.4rem]">{translations.receipt.preview}</h2>
            <span className="text-sm text-muted-foreground">
              {file ? file.name : translations.receipt.noFileSelected}
            </span>
          </div>
          <CardContent className="p-6">
            {previewUrl ? (
              <img
                className="receipt-preview"
                src={previewUrl}
                alt={translations.receipt.previewAlt}
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
                    <Badge variant="outline" className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1">
                      {translations.receipt.lines(displayedItems.length)}
                    </Badge>
                    <Badge variant="outline" className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-3 py-1">
                      {translations.receipt.total(
                        currencyFormatter.format(displayedTotal),
                      )}
                    </Badge>
                    {correctedCount > 0 ? (
                      <Badge variant="outline" className="border-[rgba(181,82,51,0.24)] bg-[var(--surface-accent)] px-3 py-1 text-[var(--accent-dark)]">
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
                      <TableHead className="text-right">{translations.receipt.table.unit}</TableHead>
                      <TableHead className="text-right">{translations.receipt.table.total}</TableHead>
                      <TableHead className="text-right">{translations.receipt.table.adjust}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedItems.map((entry, index) => (
                      <TableRow key={`${entry.normalizedItem}-${entry.lineTotal}-${entry.quantity}-${index}`}>
                        <TableCell>{entry.item}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-[var(--border)] bg-[var(--surface-plain-soft)] px-2.5 py-1">
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
                              <Badge variant="outline" className="border-[rgba(181,82,51,0.24)] bg-[var(--surface-accent)] px-2.5 py-1 text-[var(--accent-dark)]">
                                {translations.receipt.alerts.corrected}
                              </Badge>
                            ) : null}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="border-[var(--border)] bg-[var(--surface-plain)]"
                              onClick={() => openEditor(index)}
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
                      onClick={handleSaveGroceries}
                      disabled={!isAuthenticated || isSaving}
                    >
                      {isSaving ? translations.receipt.saving : translations.receipt.saveGroceries}
                    </Button>
                    <Button asChild variant="secondary" className="border-[var(--border)] bg-[var(--surface-plain)]">
                      <Link href={dashboardHref}>
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
                    onClick={toggleRawResponse}
                  >
                    {showRawResponse ? "Hide raw response" : "Show raw response"}
                  </Button>
                  {showRawResponse ? (
                    <pre className="raw-response max-h-56 overflow-auto">{result.rawResponse}</pre>
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

      <Dialog open={editorState !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent>
          {editingItem ? (
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
                    {editingItem.item}
                  </p>
                </div>

                <div className="grid gap-2">
                  <span className="text-[0.92rem] font-bold text-[var(--accent-dark)]">
                    {translations.receipt.editor.category}
                  </span>
                  <Select
                    value={editorState?.category ?? ""}
                    onValueChange={(category) => {
                      setEditorState((current) =>
                        current ? { ...current, category, error: null } : current,
                      );
                    }}
                  >
                    <SelectTrigger className="w-full rounded-[14px] border-[var(--border)] bg-[var(--surface-plain)]">
                      <SelectValue placeholder={translations.receipt.editor.selectCategory} />
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
                    onChange={(event) => {
                      const quantity = event.target.value;
                      setEditorState((current) =>
                        current ? { ...current, quantity, error: null } : current,
                      );
                    }}
                    className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface-plain)] px-3 text-[0.98rem] text-foreground outline-none ring-0 transition-colors focus:border-[var(--accent)]"
                  />
                </div>

                <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft-muted)] px-4 py-3 text-sm text-muted-foreground">
                  {translations.receipt.editor.unitPriceFixed(
                    currencyFormatter.format(editingItem.unitPrice),
                  )}
                </div>

                {editorState?.error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{editorState.error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  {editorState && editedItems[editorState.index] ? (
                    <Button type="button" variant="ghost" onClick={resetCorrection}>
                      {translations.receipt.editor.reset}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    className="border-[var(--border)] bg-[var(--surface-plain)]"
                    onClick={closeEditor}
                  >
                    {translations.common.cancel}
                  </Button>
                  <Button type="button" onClick={applyCorrection}>
                    {translations.receipt.editor.apply}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
