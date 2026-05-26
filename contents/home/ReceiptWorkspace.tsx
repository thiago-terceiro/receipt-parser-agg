"use client";

import { useSession } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLocale, useTranslations } from "@/components/locale-utils";
import {
  ExtractionResponse,
  useReceiptWorkspaceState,
} from "@/context/ReceiptWorkspaceStateProvider";
import {
  createCurrencyFormatter,
  legacyDefaultCurrencyCode,
} from "@/lib/currency";
import { formatMonthLabel } from "@/lib/groceries";
import { logInfo, logWarn, withSpan } from "@/lib/observability";
import {
  observabilityAttributes,
  observabilityEvents,
  observabilityFields,
} from "@/lib/observability-schema";
import {
  getReceiptPreviewKindFromDataUrl,
  getReceiptUploadKind,
  isPdfReceiptFileName,
  isSupportedReceiptUpload
} from "@/lib/receipt-upload";

import {
  sanitizeCategory,
  type AvailableModel,
  type ReceiptItem,
} from "../../lib/receipt";
import {
  EditorState,
  ReceiptItemEditorDialog,
} from "./ReceiptItemEditorDialog";
import { ReceiptWorkspaceResultsSection } from "./ReceiptWorkspaceResultsSection";
import { ReceiptWorkspaceUploadSection } from "./ReceiptWorkspaceUploadSection";

type ReceiptWorkspaceProps = {
  availableModels: AvailableModel[];
};

type SavedReceiptState = {
  boardId: string | null;
  month: string;
  receiptId: string;
};

type PersistedReceiptDraft = {
  editedItems: Record<number, ReceiptItem>;
  fileName: string;
  fileSize: number;
  previewDataUrl: string;
  result: ExtractionResponse;
  selectedModelId: string;
  showRawResponse: boolean;
};

type RestoredReceiptDraft = {
  fileName: string;
  fileSize: number;
  previewDataUrl: string | null;
};

const RECEIPT_WORKSPACE_DRAFT_STORAGE_KEY =
  "receipt-ai-receipt-workspace-draft";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isReceiptItem = (value: unknown): value is ReceiptItem => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.item === "string" &&
    typeof value.normalizedItem === "string" &&
    typeof value.category === "string" &&
    typeof value.quantity === "number" &&
    typeof value.unitPrice === "number" &&
    typeof value.lineTotal === "number"
  );
};

const isExtractionResponse = (value: unknown): value is ExtractionResponse => {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return false;
  }

  return (
    typeof value.backend === "string" &&
    typeof value.currencyCode === "string" &&
    typeof value.modelId === "string" &&
    typeof value.rawResponse === "string" &&
    value.items.every(isReceiptItem)
  );
};

const isEditedItemsRecord = (
  value: unknown,
): value is Record<number, ReceiptItem> =>
  isRecord(value) && Object.values(value).every(isReceiptItem);

const isPersistedReceiptDraft = (
  value: unknown,
): value is PersistedReceiptDraft => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.fileName === "string" &&
    typeof value.fileSize === "number" &&
    typeof value.previewDataUrl === "string" &&
    typeof value.selectedModelId === "string" &&
    typeof value.showRawResponse === "boolean" &&
    isEditedItemsRecord(value.editedItems) &&
    isExtractionResponse(value.result)
  );
};

const readPersistedReceiptDraft = (): PersistedReceiptDraft | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedDraft = window.sessionStorage.getItem(
      RECEIPT_WORKSPACE_DRAFT_STORAGE_KEY,
    );

    if (!storedDraft) {
      return null;
    }

    const parsedDraft: unknown = JSON.parse(storedDraft);

    if (!isPersistedReceiptDraft(parsedDraft)) {
      window.sessionStorage.removeItem(RECEIPT_WORKSPACE_DRAFT_STORAGE_KEY);
      return null;
    }

    return parsedDraft;
  } catch {
    window.sessionStorage.removeItem(RECEIPT_WORKSPACE_DRAFT_STORAGE_KEY);
    return null;
  }
};

const writePersistedReceiptDraft = (draft: PersistedReceiptDraft) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      RECEIPT_WORKSPACE_DRAFT_STORAGE_KEY,
      JSON.stringify(draft),
    );
    return;
  } catch {
    try {
      window.sessionStorage.setItem(
        RECEIPT_WORKSPACE_DRAFT_STORAGE_KEY,
        JSON.stringify({ ...draft, previewDataUrl: "" }),
      );
    } catch {
      window.sessionStorage.removeItem(RECEIPT_WORKSPACE_DRAFT_STORAGE_KEY);
    }
  }
};

const clearPersistedReceiptDraft = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(RECEIPT_WORKSPACE_DRAFT_STORAGE_KEY);
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
}: ReceiptWorkspaceProps) => {
  const locale = useLocale();
  const translations = useTranslations();
  const {
    file,
    setFile,
    selectedModelId,
    setSelectedModelId,
    result,
    setResult,
    editedItems,
    setEditedItems,
    showRawResponse,
    setShowRawResponse,
  } = useReceiptWorkspaceState();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<SavedReceiptState | null>(
    null,
  );
  const [draftPreviewDataUrl, setDraftPreviewDataUrl] = useState<string | null>(
    null,
  );
  const [restoredDraft, setRestoredDraft] = useState<RestoredReceiptDraft | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const currencyFormatter = useMemo(
    () =>
      createCurrencyFormatter(
        locale,
        result?.currencyCode ?? legacyDefaultCurrencyCode,
      ),
    [locale, result?.currencyCode],
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
  const editingItem = editorState
    ? (displayedItems[editorState.index] ?? null)
    : null;
  const dashboardHref = savedReceipt
    ? {
      pathname: "/groceries",
      query: {
        ...(savedReceipt.boardId ? { board: savedReceipt.boardId } : {}),
        ...(savedReceipt.month ? { month: savedReceipt.month } : {}),
        saved: savedReceipt.receiptId,
      },
    }
    : "/groceries";
  const displayedFileName = file?.name ?? restoredDraft?.fileName ?? null;
  const displayedFileSize = file?.size ?? restoredDraft?.fileSize ?? null;
  const displayedPreviewUrl = previewUrl ?? restoredDraft?.previewDataUrl ?? null;
  const displayedPreviewKind = file
    ? getReceiptUploadKind(file)
    : (getReceiptPreviewKindFromDataUrl(restoredDraft?.previewDataUrl) ??
      (isPdfReceiptFileName(displayedFileName) ? "pdf" : null));
  const previewPlaceholderText = displayedPreviewKind === "pdf"
    ? translations.receipt.pdfPreviewPlaceholder
    : translations.receipt.previewPlaceholder;
  const hasSelectedFile = displayedFileName !== null;

  useEffect(() => {
    if (!file || !isSupportedReceiptUpload(file)) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!file || !isSupportedReceiptUpload(file)) {
      setDraftPreviewDataUrl(null);
      return;
    }

    let isCancelled = false;
    const reader = new FileReader();

    reader.onload = () => {
      if (isCancelled) {
        return;
      }

      setDraftPreviewDataUrl(
        typeof reader.result === "string" ? reader.result : null,
      );
    };
    reader.onerror = () => {
      if (!isCancelled) {
        setDraftPreviewDataUrl(null);
      }
    };
    reader.readAsDataURL(file);

    return () => {
      isCancelled = true;
      if (reader.readyState === FileReader.LOADING) {
        reader.abort();
      }
    };
  }, [file]);

  useEffect(() => {
    if (file || result) {
      return;
    }

    const persistedDraft = readPersistedReceiptDraft();

    if (!persistedDraft) {
      return;
    }

    setSelectedModelId(persistedDraft.selectedModelId);
    setResult(persistedDraft.result);
    setEditedItems(persistedDraft.editedItems);
    setShowRawResponse(persistedDraft.showRawResponse);
    setRestoredDraft({
      fileName: persistedDraft.fileName,
      fileSize: persistedDraft.fileSize,
      previewDataUrl: persistedDraft.previewDataUrl || null,
    });
  }, [
    file,
    result,
    setEditedItems,
    setResult,
    setSelectedModelId,
    setShowRawResponse,
  ]);

  useEffect(() => {
    if (!result || saveMessage) {
      return;
    }

    const fileName = file?.name ?? restoredDraft?.fileName;
    const fileSize = file?.size ?? restoredDraft?.fileSize;
    const previewDataUrl =
      file != null ? (draftPreviewDataUrl ?? "") : (restoredDraft?.previewDataUrl ?? "");

    if (!fileName || fileSize == null) {
      return;
    }

    writePersistedReceiptDraft({
      editedItems,
      fileName,
      fileSize,
      previewDataUrl,
      result,
      selectedModelId,
      showRawResponse,
    });
  }, [
    draftPreviewDataUrl,
    editedItems,
    file,
    restoredDraft,
    result,
    saveMessage,
    selectedModelId,
    showRawResponse,
  ]);

  const resetWorkspaceState = useCallback(() => {
    clearPersistedReceiptDraft();
    setResult(null);
    setError(null);
    setSaveMessage(null);
    setEditedItems({});
    setEditorState(null);
    setShowRawResponse(false);
    setSavedReceipt(null);
    setRestoredDraft(null);
  }, [setEditedItems, setResult, setShowRawResponse]);

  const clearSelectedFile = useCallback(() => {
    setFile(null);
    setIsDraggingFile(false);
    resetWorkspaceState();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [resetWorkspaceState, setFile]);

  const applySelectedFile = useCallback(
    (nextFile: File | null) => {
      if (!nextFile) {
        clearSelectedFile();
        return;
      }

      if (!isSupportedReceiptUpload(nextFile)) {
        setError(translations.receipt.errors.invalidImage);
        return;
      }

      setDraftPreviewDataUrl(null);
      setFile(nextFile);
      resetWorkspaceState();
    },
    [
      clearSelectedFile,
      resetWorkspaceState,
      setFile,
      translations.receipt.errors.invalidImage,
    ],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0] ?? null;
      applySelectedFile(nextFile);
    },
    [applySelectedFile],
  );

  const handleDropzoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDropzoneDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingFile(true);
    },
    [],
  );

  const handleDropzoneDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }
      setIsDraggingFile(false);
    },
    [],
  );

  const handleDropzoneDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingFile(false);
      const nextFile = event.dataTransfer.files?.[0] ?? null;
      applySelectedFile(nextFile);
    },
    [applySelectedFile],
  );

  const handleDropzoneKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      handleDropzoneClick();
    },
    [handleDropzoneClick],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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
        const extraction = await withSpan(
          "ui.receipt.extract_submit",
          async (span) => {
            const response = await fetch("/api/extract", {
              method: "POST",
              body: formData,
            });
            const payload = await parseJsonResponse<
              ExtractionResponse | { error?: string }
            >(response);

            span.setAttributes({
              [observabilityAttributes.httpStatusCode]: response.status,
              [observabilityAttributes.receiptFileSelected]: true,
              [observabilityAttributes.receiptModelSelected]: Boolean(selectedModelId),
            });

            if (!response.ok) {
              throw new Error(
                "error" in payload && payload.error
                  ? payload.error
                  : translations.receipt.errors.extractionFailed,
              );
            }

            const resolvedPayload = payload as ExtractionResponse;
            span.setAttributes({
              [observabilityAttributes.receiptItemCount]: resolvedPayload.items.length,
            });

            return resolvedPayload;
          },
        );

        logInfo("Receipt extraction completed in browser.", {
          [observabilityFields.event]: observabilityEvents.uiReceiptExtractSuccess,
          [observabilityAttributes.receiptItemCount]: extraction.items.length,
        });
        setResult(extraction);
      } catch (requestError) {
        logWarn("Receipt extraction failed in browser.", {
          [observabilityFields.event]: observabilityEvents.uiReceiptExtractFailed,
          [observabilityFields.errorMessage]:
            requestError instanceof Error
              ? requestError.message
              : translations.receipt.errors.unexpectedRequest,
        });
        setError(
          requestError instanceof Error
            ? requestError.message
            : translations.receipt.errors.unexpectedRequest,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      file,
      resetWorkspaceState,
      selectedModelId,
      setResult,
      translations.receipt.errors.extractionFailed,
      translations.receipt.errors.noFile,
      translations.receipt.errors.unexpectedRequest,
    ],
  );

  const handleSaveGroceries = useCallback(async () => {
    if (!result || displayedItems.length === 0) {
      setError(translations.receipt.errors.noResultToSave);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const payload = await withSpan(
        "ui.receipt.save_groceries",
        async (span) => {
          const response = await fetch("/api/expenses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              currencyCode: result.currencyCode,
              items: displayedItems,
              sourceFileName: displayedFileName,
              modelId: result.modelId,
            }),
          });

          const parsedPayload = await parseJsonResponse<{
            boardId?: string;
            error?: string;
            savedCount?: number;
            month?: string;
            receiptId?: string;
          }>(response);

          span.setAttributes({
            [observabilityAttributes.httpStatusCode]: response.status,
            [observabilityAttributes.receiptItemCount]: displayedItems.length,
            [observabilityAttributes.receiptHasSourceFile]: Boolean(displayedFileName),
          });

          if (!response.ok) {
            throw new Error(
              parsedPayload.error || translations.receipt.errors.saveFailed,
            );
          }

          return parsedPayload;
        },
      );

      const receiptId = payload.receiptId ?? String(Date.now());
      const savedMonth = payload.month ?? "";
      setSavedReceipt({
        boardId:
          typeof payload.boardId === "string" && payload.boardId.trim()
            ? payload.boardId
            : null,
        month: savedMonth,
        receiptId,
      });

      const savedMonthLabel = savedMonth
        ? formatMonthLabel(savedMonth, locale)
        : formatMonthLabel(new Date().toISOString().slice(0, 7), locale);
      setSaveMessage(
        translations.receipt.saveSuccess(
          payload.savedCount ?? displayedItems.length,
          savedMonthLabel,
        ),
      );
      clearPersistedReceiptDraft();
      logInfo("Saved groceries from receipt in browser.", {
        [observabilityFields.event]: observabilityEvents.uiReceiptSaveSuccess,
        [observabilityAttributes.receiptItemCount]: payload.savedCount ?? displayedItems.length,
      });
    } catch (requestError) {
      logWarn("Saving groceries from receipt failed in browser.", {
        [observabilityFields.event]: observabilityEvents.uiReceiptSaveFailed,
        [observabilityFields.errorMessage]:
          requestError instanceof Error
            ? requestError.message
            : translations.receipt.errors.unexpectedSave,
      });
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
    displayedFileName,
    locale,
    result,
    translations.receipt,
  ]);

  const closeEditor = useCallback(() => {
    setEditorState(null);
  }, []);

  const openEditor = useCallback(
    (index: number) => {
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
    },
    [displayedItems],
  );

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
    setEditedItems,
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
  }, [closeEditor, editorState, setEditedItems]);

  const toggleRawResponse = useCallback(() => {
    setShowRawResponse((current) => !current);
  }, [setShowRawResponse]);

  const handleEditorCategoryChange = useCallback((category: string) => {
    setEditorState((current) =>
      current ? { ...current, category, error: null } : current,
    );
  }, []);

  const handleEditorQuantityChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const quantity = event.target.value;
      setEditorState((current) =>
        current ? { ...current, quantity, error: null } : current,
      );
    },
    [],
  );

  const hasEditorCorrection =
    editorState !== null && Boolean(editedItems[editorState.index]);

  return (
    <>
      <ReceiptWorkspaceUploadSection
        availableModels={availableModels}
        canSubmit={file !== null}
        error={error}
        fileInputRef={fileInputRef}
        hasSelectedFile={hasSelectedFile}
        isDraggingFile={isDraggingFile}
        isLoading={isLoading}
        saveMessage={saveMessage}
        selectedModelId={selectedModelId}
        selectedFileName={displayedFileName}
        selectedFileSize={displayedFileSize}
        translations={translations}
        onClearSelectedFile={clearSelectedFile}
        onDropzoneClick={handleDropzoneClick}
        onDropzoneDragLeave={handleDropzoneDragLeave}
        onDropzoneDragOver={handleDropzoneDragOver}
        onDropzoneDrop={handleDropzoneDrop}
        onDropzoneKeyDown={handleDropzoneKeyDown}
        onFileChange={handleFileChange}
        onModelChange={setSelectedModelId}
        onSubmit={handleSubmit}
      />

      <ReceiptWorkspaceResultsSection
        correctedCount={correctedCount}
        currencyFormatter={currencyFormatter}
        dashboardHref={dashboardHref}
        locale={locale}
        displayedItems={displayedItems}
        displayedFileName={displayedFileName}
        displayedTotal={displayedTotal}
        editedItems={editedItems}
        isAuthenticated={isAuthenticated}
        isSaving={isSaving}
        previewKind={displayedPreviewKind}
        previewPlaceholderText={previewPlaceholderText}
        previewUrl={displayedPreviewUrl}
        result={result}
        saveMessage={saveMessage}
        showRawResponse={showRawResponse}
        translations={translations}
        onEditItem={openEditor}
        onSaveGroceries={handleSaveGroceries}
        onToggleRawResponse={toggleRawResponse}
      />

      <ReceiptItemEditorDialog
        currencyFormatter={currencyFormatter}
        editorState={editorState}
        hasCorrection={hasEditorCorrection}
        item={editingItem}
        translations={translations}
        onApply={applyCorrection}
        onCategoryChange={handleEditorCategoryChange}
        onClose={closeEditor}
        onQuantityChange={handleEditorQuantityChange}
        onReset={resetCorrection}
      />
    </>
  );
};
