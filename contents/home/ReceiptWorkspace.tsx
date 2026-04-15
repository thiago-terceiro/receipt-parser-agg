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
import { formatMonthLabel } from "@/lib/groceries";
import { localizePath } from "@/lib/i18n/config";

import {
  EditorState,
  ReceiptItemEditorDialog,
} from "./ReceiptItemEditorDialog";
import { ReceiptWorkspaceResultsSection } from "./ReceiptWorkspaceResultsSection";
import { ReceiptWorkspaceUploadSection } from "./ReceiptWorkspaceUploadSection";
import {
  sanitizeCategory,
  type AvailableModel,
} from "../../lib/receipt";

type ReceiptWorkspaceProps = {
  availableModels: AvailableModel[];
};

type SavedReceiptState = {
  boardId: string | null;
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
  const editingItem = editorState
    ? (displayedItems[editorState.index] ?? null)
    : null;
  const dashboardHref = savedReceipt
    ? (() => {
        const searchParams = new URLSearchParams();

        if (savedReceipt.boardId) {
          searchParams.set("board", savedReceipt.boardId);
        }

        if (savedReceipt.month) {
          searchParams.set("month", savedReceipt.month);
        }

        searchParams.set("saved", savedReceipt.receiptId);

        return `${dashboardBaseHref}?${searchParams.toString()}`;
      })()
    : dashboardBaseHref;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  const resetWorkspaceState = useCallback(() => {
    setResult(null);
    setError(null);
    setSaveMessage(null);
    setEditedItems({});
    setEditorState(null);
    setShowRawResponse(false);
    setSavedReceipt(null);
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

      if (!nextFile.type.startsWith("image/")) {
        setError(translations.receipt.errors.invalidImage);
        return;
      }

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
        const response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });
        const payload = await parseJsonResponse<
          ExtractionResponse | { error?: string }
        >(response);
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
        boardId?: string;
        error?: string;
        savedCount?: number;
        month?: string;
        receiptId?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(
          payload.error || translations.receipt.errors.saveFailed,
        );
      }

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
        error={error}
        file={file}
        fileInputRef={fileInputRef}
        isDraggingFile={isDraggingFile}
        isLoading={isLoading}
        saveMessage={saveMessage}
        selectedModelId={selectedModelId}
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
        displayedItems={displayedItems}
        displayedTotal={displayedTotal}
        editedItems={editedItems}
        file={file}
        isAuthenticated={isAuthenticated}
        isSaving={isSaving}
        previewUrl={previewUrl}
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
