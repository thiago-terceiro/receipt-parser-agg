"use client";

import { useSession } from "next-auth/react";
import {
  startTransition,
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
import type { BoardSummary } from "@/lib/boards";
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
  isSupportedReceiptUpload,
} from "@/lib/receipt-upload";

import {
  EditorState,
  ReceiptItemEditorDialog,
} from "./ReceiptItemEditorDialog";
import { ReceiptWorkspaceResultsSection } from "./ReceiptWorkspaceResultsSection";
import { ReceiptWorkspaceUploadSection } from "./ReceiptWorkspaceUploadSection";
import {
  sanitizeCategory,
  normalizeItemName,
  type AvailableModel,
  type ReceiptItem,
} from "../../lib/receipt";

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
  manualItems?: ReceiptItem[];
  previewDataUrl: string;
  result: ExtractionResponse;
  selectedBoardId?: string;
  selectedModelId: string;
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

const isReceiptItemsArray = (value: unknown): value is ReceiptItem[] =>
  Array.isArray(value) && value.every(isReceiptItem);

const isBoardSummary = (value: unknown): value is BoardSummary => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.ownerUserId === "string" &&
    (value.role === "owner" || value.role === "editor") &&
    (typeof value.joinedAt === "string" || value.joinedAt === null) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (typeof value.archivedAt === "string" || value.archivedAt === null)
  );
};

const parsePositiveDecimal = (value: string): number | null => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return Number(parsedValue.toFixed(2));
};

const isPersistedReceiptDraft = (
  value: unknown,
): value is PersistedReceiptDraft => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.fileName === "string" &&
    typeof value.fileSize === "number" &&
    (value.manualItems === undefined || isReceiptItemsArray(value.manualItems)) &&
    typeof value.previewDataUrl === "string" &&
    (value.selectedBoardId === undefined || typeof value.selectedBoardId === "string") &&
    typeof value.selectedModelId === "string" &&
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
    manualItems,
    setManualItems,
  } = useReceiptWorkspaceState();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [availableBoards, setAvailableBoards] = useState<BoardSummary[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [isBoardsLoading, setIsBoardsLoading] = useState(false);
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
  const extractedItemCount = result?.items.length ?? 0;

  const displayedItems = useMemo(
    () => [
      ...(result?.items.map((item, index) => editedItems[index] ?? item) ?? []),
      ...manualItems,
    ],
    [editedItems, manualItems, result],
  );
  const displayedTotal = useMemo(
    () => displayedItems.reduce((sum, entry) => sum + entry.lineTotal, 0),
    [displayedItems],
  );
  const correctedCount = Object.keys(editedItems).length;
  const editingItem = editorState?.mode === "adjust" && editorState.index !== null
    ? (displayedItems[editorState.index] ?? null)
    : editorState?.mode === "edit-manual" && editorState.index !== null
      ? (manualItems[editorState.index] ?? null)
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
    : selectedBoardId
      ? {
        pathname: "/groceries",
        query: {
          board: selectedBoardId,
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
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!file || !isSupportedReceiptUpload(file)) {
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

    startTransition(() => {
      setSelectedModelId(persistedDraft.selectedModelId);
      setResult(persistedDraft.result);
      setEditedItems(persistedDraft.editedItems);
      setManualItems(persistedDraft.manualItems ?? []);
      setSelectedBoardId(persistedDraft.selectedBoardId ?? "");
      setRestoredDraft({
        fileName: persistedDraft.fileName,
        fileSize: persistedDraft.fileSize,
        previewDataUrl: persistedDraft.previewDataUrl || null,
      });
    });
  }, [
    file,
    result,
    setEditedItems,
    setManualItems,
    setResult,
    setSelectedBoardId,
    setSelectedModelId,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !result) {
      return;
    }

    let isCancelled = false;

    const loadBoards = async () => {
      setIsBoardsLoading(true);
      setBoardsError(null);

      try {
        const payload = await parseJsonResponse<{
          boards?: unknown;
          error?: string;
        }>(await fetch("/api/boards"));

        const boards = Array.isArray(payload.boards)
          ? payload.boards.filter(isBoardSummary)
          : null;

        if (!boards) {
          throw new Error(translations.receipt.errors.loadDashboards);
        }

        if (isCancelled) {
          return;
        }

        setAvailableBoards(boards);
        setSelectedBoardId((current) => {
          if (current && boards.some((board) => board.id === current)) {
            return current;
          }

          return boards[0]?.id ?? "";
        });
      } catch (requestError) {
        if (isCancelled) {
          return;
        }

        setAvailableBoards([]);
        setSelectedBoardId("");
        setBoardsError(
          requestError instanceof Error
            ? requestError.message
            : translations.receipt.errors.loadDashboards,
        );
      } finally {
        if (!isCancelled) {
          setIsBoardsLoading(false);
        }
      }
    };

    void loadBoards();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, result, translations.receipt.errors.loadDashboards]);

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
      manualItems,
      previewDataUrl,
      result,
      selectedBoardId,
      selectedModelId,
    });
  }, [
    draftPreviewDataUrl,
    editedItems,
    file,
    manualItems,
    restoredDraft,
    result,
    saveMessage,
    selectedBoardId,
    selectedModelId,
  ]);

  const resetWorkspaceState = useCallback(() => {
    clearPersistedReceiptDraft();
    setResult(null);
    setError(null);
    setBoardsError(null);
    setAvailableBoards([]);
    setSelectedBoardId("");
    setIsBoardsLoading(false);
    setSaveMessage(null);
    setEditedItems({});
    setManualItems([]);
    setEditorState(null);
    setSavedReceipt(null);
    setRestoredDraft(null);
  }, [setEditedItems, setManualItems, setResult]);

  const clearSelectedFile = useCallback(() => {
    setDraftPreviewDataUrl(null);
    setFile(null);
    setIsDraggingFile(false);
    setPreviewUrl(null);
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

      setPreviewUrl(URL.createObjectURL(nextFile));
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

    if (!selectedBoardId) {
      setError(translations.receipt.errors.noDashboardSelected);
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
              boardId: selectedBoardId,
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
            : selectedBoardId,
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
    selectedBoardId,
    translations.receipt,
  ]);

  const closeEditor = useCallback(() => {
    setEditorState(null);
  }, []);

  const openEditor = useCallback(
    (index: number) => {
      if (index < extractedItemCount) {
        const item = displayedItems[index];
        if (!item) {
          return;
        }

        setEditorState({
          mode: "adjust",
          index,
          itemName: item.item,
          category: item.category,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          error: null,
        });
        return;
      }

      const manualIndex = index - extractedItemCount;
      const item = manualItems[manualIndex];
      if (!item) {
        return;
      }

      setEditorState({
        mode: "edit-manual",
        index: manualIndex,
        itemName: item.item,
        category: item.category,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        error: null,
      });
    },
    [displayedItems, extractedItemCount, manualItems],
  );

  const openManualItemEditor = useCallback(() => {
    setEditorState({
      mode: "add-manual",
      index: null,
      itemName: "",
      category: "other",
      quantity: "1",
      unitPrice: "",
      error: null,
    });
  }, []);

  const applyCorrection = useCallback(() => {
    if (!editorState) {
      return;
    }

    const category = sanitizeCategory(editorState.category);
    const quantity = parsePositiveDecimal(editorState.quantity);

    if (!category) {
      setEditorState((current) =>
        current
          ? { ...current, error: translations.receipt.errors.invalidCategory }
          : current,
      );
      return;
    }

    if (quantity === null) {
      setEditorState((current) =>
        current
          ? { ...current, error: translations.receipt.errors.invalidQuantity }
          : current,
      );
      return;
    }

    if (editorState.mode === "adjust") {
      if (editorState.index === null) {
        closeEditor();
        return;
      }

      const sourceItem = displayedItems[editorState.index];
      if (!sourceItem) {
        closeEditor();
        return;
      }

      setEditedItems((current) => ({
        ...current,
        [editorState.index as number]: {
          ...sourceItem,
          category,
          quantity,
          lineTotal: Number((sourceItem.unitPrice * quantity).toFixed(2)),
        },
      }));
      closeEditor();
      return;
    }

    const itemName = editorState.itemName.trim();
    if (!itemName) {
      setEditorState((current) =>
        current
          ? { ...current, error: translations.receipt.errors.invalidItemName }
          : current,
      );
      return;
    }

    const unitPrice = parsePositiveDecimal(editorState.unitPrice);
    if (unitPrice === null) {
      setEditorState((current) =>
        current
          ? { ...current, error: translations.receipt.errors.invalidUnitPrice }
          : current,
      );
      return;
    }

    const manualItem: ReceiptItem = {
      item: itemName,
      normalizedItem: normalizeItemName(itemName),
      category,
      quantity,
      unitPrice,
      lineTotal: Number((quantity * unitPrice).toFixed(2)),
    };

    if (editorState.mode === "add-manual") {
      setManualItems((current) => [...current, manualItem]);
      closeEditor();
      return;
    }

    if (editorState.index === null || !manualItems[editorState.index]) {
      closeEditor();
      return;
    }

    setManualItems((current) =>
      current.map((item, index) =>
        index === editorState.index ? manualItem : item,
      ),
    );
    closeEditor();
  }, [
    closeEditor,
    displayedItems,
    editorState,
    setEditedItems,
    setManualItems,
    manualItems,
    translations.receipt.errors.invalidItemName,
    translations.receipt.errors.invalidCategory,
    translations.receipt.errors.invalidQuantity,
    translations.receipt.errors.invalidUnitPrice,
  ]);

  const resetCorrection = useCallback(() => {
    if (!editorState || editorState.mode !== "adjust" || editorState.index === null) {
      return;
    }

    const index = editorState.index;

    setEditedItems((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
    closeEditor();
  }, [closeEditor, editorState, setEditedItems]);

  const removeManualItem = useCallback(
    (manualIndex: number) => {
      setManualItems((current) =>
        current.filter((_, index) => index !== manualIndex),
      );
      setEditorState((current) =>
        current?.mode === "edit-manual" && current.index === manualIndex
          ? null
          : current,
      );
    },
    [setManualItems],
  );

  const handleEditorCategoryChange = useCallback((category: string) => {
    setEditorState((current) =>
      current ? { ...current, category, error: null } : current,
    );
  }, []);

  const handleEditorItemNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const itemName = event.target.value;
      setEditorState((current) =>
        current ? { ...current, itemName, error: null } : current,
      );
    },
    [],
  );

  const handleEditorQuantityChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const quantity = event.target.value;
      setEditorState((current) =>
        current ? { ...current, quantity, error: null } : current,
      );
    },
    [],
  );

  const handleEditorUnitPriceChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const unitPrice = event.target.value;
      setEditorState((current) =>
        current ? { ...current, unitPrice, error: null } : current,
      );
    },
    [],
  );

  const hasEditorCorrection =
    editorState?.mode === "adjust" &&
    editorState.index !== null &&
    Boolean(editedItems[editorState.index]);

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
        availableBoards={availableBoards}
        boardsError={boardsError}
        correctedCount={correctedCount}
        currencyFormatter={currencyFormatter}
        dashboardHref={dashboardHref}
        locale={locale}
        displayedItems={displayedItems}
        displayedFileName={displayedFileName}
        displayedTotal={displayedTotal}
        editedItems={editedItems}
        extractedItemCount={extractedItemCount}
        isAuthenticated={isAuthenticated}
        isBoardsLoading={isBoardsLoading}
        isSaving={isSaving}
        previewKind={displayedPreviewKind}
        previewPlaceholderText={previewPlaceholderText}
        previewUrl={displayedPreviewUrl}
        result={result}
        saveMessage={saveMessage}
        selectedBoardId={selectedBoardId}
        translations={translations}
        onAddManualItem={openManualItemEditor}
        onBoardChange={setSelectedBoardId}
        onEditItem={openEditor}
        onRemoveManualItem={removeManualItem}
        onSaveGroceries={handleSaveGroceries}
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
        onItemNameChange={handleEditorItemNameChange}
        onQuantityChange={handleEditorQuantityChange}
        onReset={resetCorrection}
        onUnitPriceChange={handleEditorUnitPriceChange}
      />
    </>
  );
};
