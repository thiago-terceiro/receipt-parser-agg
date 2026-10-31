import type { ParsedReceiptExtraction } from "@/lib/receipt";

export type ReceiptUploadLike = {
    name?: string | null;
    type?: string | null;
};

export type ReceiptUploadKind = "image" | "pdf";

const imageFileExtensionPattern =
    /\.(avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i;
const pdfFileExtensionPattern = /\.pdf$/i;

export const receiptUploadAccept = "image/*,application/pdf";
export const maxReceiptFileSizeBytes = 10 * 1024 * 1024; // 10 MB

const normalizeFileName = (fileName: string | null | undefined): string =>
    (fileName ?? "").trim().toLowerCase();

const normalizeMimeType = (mimeType: string | null | undefined): string =>
    (mimeType ?? "").trim().toLowerCase();

export const isPdfReceiptFileName = (
    fileName: string | null | undefined,
): boolean => {
    return pdfFileExtensionPattern.test(normalizeFileName(fileName));
};

export const getReceiptUploadKind = (
    file: ReceiptUploadLike,
): ReceiptUploadKind | null => {
    if (isImageReceiptUpload(file)) {
        return "image";
    }

    if (isPdfReceiptUpload(file)) {
        return "pdf";
    }

    return null;
};

export const getReceiptPreviewKindFromDataUrl = (
    value: string | null | undefined,
): ReceiptUploadKind | null => {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue.startsWith("data:application/pdf")) {
        return "pdf";
    }

    if (normalizedValue.startsWith("data:image/svg")) {
        return null;
    }

    if (normalizedValue.startsWith("data:image/")) {
        return "image";
    }

    return null;
};

export const isImageReceiptUpload = (file: ReceiptUploadLike): boolean => {
    const mimeType = normalizeMimeType(file.type);
    const fileName = normalizeFileName(file.name);

    if (
        mimeType.startsWith("image/svg") ||
        mimeType.includes("svg") ||
        fileName.endsWith(".svg") ||
        fileName.endsWith(".svgz")
    ) {
        return false;
    }

    if (mimeType.startsWith("image/")) {
        return true;
    }

    return !mimeType && imageFileExtensionPattern.test(fileName);
};

export const isPdfReceiptUpload = (file: ReceiptUploadLike): boolean => {
    const mimeType = normalizeMimeType(file.type);
    if (mimeType === "application/pdf") {
        return true;
    }

    return !mimeType && isPdfReceiptFileName(file.name);
};

export const isSupportedReceiptUpload = (file: ReceiptUploadLike): boolean => {
    return isImageReceiptUpload(file) || isPdfReceiptUpload(file);
};

export const mergeReceiptExtractions = (
    extractions: ParsedReceiptExtraction[],
): ParsedReceiptExtraction => {
    if (extractions.length === 0) {
        throw new Error("At least one receipt extraction is required.");
    }

    const purchaseDate = extractions.find((e) => e.purchaseDate)?.purchaseDate ?? null;

    return {
        currencyCode: extractions[0].currencyCode,
        purchaseDate,
        items: extractions.flatMap((extraction) => extraction.items),
    };
};