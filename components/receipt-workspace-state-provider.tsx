"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { ReceiptItem } from "@/lib/receipt";

export type ExtractionResponse = {
  backend: string;
  modelId: string;
  items: ReceiptItem[];
  rawResponse: string;
};

type ReceiptWorkspaceStateContextValue = {
  file: File | null;
  setFile: Dispatch<SetStateAction<File | null>>;
  selectedModelId: string;
  setSelectedModelId: Dispatch<SetStateAction<string>>;
  result: ExtractionResponse | null;
  setResult: Dispatch<SetStateAction<ExtractionResponse | null>>;
  editedItems: Record<number, ReceiptItem>;
  setEditedItems: Dispatch<SetStateAction<Record<number, ReceiptItem>>>;
  showRawResponse: boolean;
  setShowRawResponse: Dispatch<SetStateAction<boolean>>;
};

const ReceiptWorkspaceStateContext = createContext<
  ReceiptWorkspaceStateContextValue | undefined
>(undefined);

type ReceiptWorkspaceStateProviderProps = {
  children: ReactNode;
  defaultModelId: string;
};

export const ReceiptWorkspaceStateProvider = ({
  children,
  defaultModelId,
}: ReceiptWorkspaceStateProviderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(defaultModelId);
  const [result, setResult] = useState<ExtractionResponse | null>(null);
  const [editedItems, setEditedItems] = useState<Record<number, ReceiptItem>>({});
  const [showRawResponse, setShowRawResponse] = useState(false);

  const value = useMemo(
    () => ({
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
    }),
    [editedItems, file, result, selectedModelId, showRawResponse],
  );

  return (
    <ReceiptWorkspaceStateContext.Provider value={value}>
      {children}
    </ReceiptWorkspaceStateContext.Provider>
  );
};

export const useReceiptWorkspaceState = () => {
  const context = useContext(ReceiptWorkspaceStateContext);

  if (!context) {
    throw new Error(
      "useReceiptWorkspaceState must be used within ReceiptWorkspaceStateProvider.",
    );
  }

  return context;
};
