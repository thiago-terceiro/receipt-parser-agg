"use client";

import {
    ChangeEvent,
    DragEvent,
    FormEvent,
    useEffect,
    useRef,
    useState,
} from "react";

import { FileImage, Upload, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { AvailableModel } from "../lib/receipt";

type ReceiptItem = {
  item: string;
  price: number;
};

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

export const ReceiptWorkspace = ({
  availableModels,
  defaultModelId,
}: ReceiptWorkspaceProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(defaultModelId);
  const [result, setResult] = useState<ExtractionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSelectedModelId(defaultModelId);
  }, [defaultModelId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearSelectedFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setIsDraggingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applySelectedFile = (nextFile: File | null) => {
    if (!nextFile) {
      clearSelectedFile();
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setError("Use an image file such as PNG, JPG, or WEBP.");
      return;
    }

    setFile(nextFile);
    setResult(null);
    setError(null);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    applySelectedFile(nextFile);
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDropzoneDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDropzoneDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsDraggingFile(false);
  };

  const handleDropzoneDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const nextFile = event.dataTransfer.files?.[0] ?? null;
    applySelectedFile(nextFile);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Select a receipt image before extracting.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (selectedModelId) formData.append("modelId", selectedModelId);

    try {
      const response = await fetch("/api/extract", { method: "POST", body: formData });
      const payload = (await response.json()) as ExtractionResponse | { error?: string };
      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error ? payload.error : "Extraction failed.",
        );
      }
      setResult(payload as ExtractionResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unexpected request error.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ── Hero card ── */}
      <section className="grid gap-6 rounded-[28px] border border-[var(--border)] bg-card p-7 shadow-[var(--shadow)] backdrop-blur-[16px] [grid-template-columns:1.2fr_0.8fr] max-[900px]:[grid-template-columns:1fr]">
        {/* Copy */}
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--accent-dark)]">
            Receipt AI
          </p>
          <h1 className="m-0 text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.04em] text-balance">
            Upload a receipt and extract line items without running the model locally.
          </h1>
          <p className="max-w-[54ch] text-muted-foreground text-[1.02rem] leading-[1.7]">
            This frontend is designed for Vercel. The browser uploads the image to a server
            route, and the server route calls Hugging Face with the model configured in the
            server environment.
          </p>
        </div>

        {/* Upload form */}
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
                ? "border-[var(--accent)] bg-[rgba(255,250,243,0.98)] shadow-[0_0_0_4px_rgba(181,82,51,0.12)]"
                : "border-[rgba(181,82,51,0.42)]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-full bg-white/80 text-[var(--accent-dark)] shadow-sm">
                  {file ? <FileImage className="size-5" /> : <Upload className="size-5" />}
                </div>
                <div className="grid gap-1">
                  <span className="text-[1.15rem] font-bold">
                    {file ? "Receipt image ready" : "Drop a receipt image here"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {file
                      ? "Replace it by dropping another image or browsing files."
                      : "PNG, JPG, or WEBP works best. Click to browse if you prefer."}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="border-[var(--border)] bg-white/70 px-3 py-1">
                image/*
              </Badge>
            </div>

            {file ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
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
                  aria-label="Remove selected image"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="rounded-full border border-[var(--border)] bg-white/70 px-3 py-1.5">
                  Drag and drop
                </span>
                <span>or click anywhere in this panel to browse</span>
              </div>
            )}
          </button>

          <div className="grid gap-2">
            <span className="text-[0.92rem] font-bold text-[var(--accent-dark)]">Model</span>
            <Select
              value={selectedModelId}
              onValueChange={(v) => setSelectedModelId(v)}
              disabled={isLoading || availableModels.length === 0}
            >
              <SelectTrigger className="w-full rounded-[14px] border-[var(--border)] bg-white/90">
                <SelectValue placeholder="Select model" />
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
            The server default comes from HF_MODEL_ID. You can switch to Qwen3-VL-8B-Instruct here.
          </p>

          <div className="grid grid-cols-2 gap-3 max-[500px]:grid-cols-1">
            <Button type="submit" disabled={!file || isLoading} className="w-full">
              {isLoading ? "Extracting..." : "Extract receipt"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={clearSelectedFile}
              disabled={!file || isLoading}
              className="w-full"
            >
              Remove image
            </Button>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </section>

      {/* ── Results grid ── */}
      <section className="mt-6 grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
        {/* Preview panel */}
        <Card className="gap-0 rounded-[24px] border-[var(--border)] py-0 shadow-[var(--shadow)] backdrop-blur-[16px]">
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
            <h2 className="m-0 text-[1.4rem]">Preview</h2>
            <span className="text-sm text-muted-foreground">
              {file ? file.name : "No file selected"}
            </span>
          </div>
          <CardContent className="p-6">
            {previewUrl ? (
              <img className="receipt-preview" src={previewUrl} alt="Receipt preview" />
            ) : (
              <div className="grid min-h-[240px] place-items-center rounded-[18px] border border-dashed border-[var(--border)] bg-white/55 p-6 text-center text-muted-foreground">
                Your receipt preview will appear here.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results panel */}
        <Card className="gap-0 rounded-[24px] border-[var(--border)] py-0 shadow-[var(--shadow)] backdrop-blur-[16px]">
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
            <h2 className="m-0 text-[1.4rem]">Extracted items</h2>
            <span className="text-sm text-muted-foreground">
              {result ? result.modelId : "Waiting for extraction"}
            </span>
          </div>
          <CardContent className="p-6">
            {result ? (
              <>
                <p className="mb-3 text-sm text-muted-foreground">Served by {result.backend}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.items.map((entry) => (
                      <TableRow key={`${entry.item}-${entry.price}`}>
                        <TableCell>{entry.item}</TableCell>
                        <TableCell className="text-right">${entry.price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <pre className="raw-response">{result.rawResponse}</pre>
              </>
            ) : (
              <div className="grid min-h-[240px] place-items-center rounded-[18px] border border-dashed border-[var(--border)] bg-white/55 p-6 text-center text-muted-foreground">
                Extracted line items and the raw model response will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
};
