export type ReceiptItem = {
    item: string;
    price: number;
};

export type AvailableModel = {
    id: string;
    label: string;
    providers: string[];
};

export type ModelCatalogSource = "router" | "hub-api" | "fallback";

const fallbackModelId = "Qwen/Qwen2.5-VL-7B-Instruct";
const additionalDropdownModelId = "Qwen/Qwen3-VL-8B-Instruct";
const maxModelIdLength = 128;

export const sanitizeModelId = (value: unknown): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxModelIdLength) {
        return null;
    }

    if (/\s/.test(trimmed)) {
        return null;
    }

    if (!/^[A-Za-z0-9._/-]+$/.test(trimmed)) {
        return null;
    }

    if (trimmed.startsWith("/") || trimmed.endsWith("/") || trimmed.includes("//")) {
        return null;
    }

    return trimmed;
};

export const defaultModelId =
    sanitizeModelId(process.env.HF_MODEL_ID) ?? fallbackModelId;

export const defaultProvider = process.env.HF_PROVIDER?.trim() || "auto";

export const fallbackAvailableModels: AvailableModel[] = [
    {
        id: defaultModelId,
        label: `${defaultModelId} (env default)`,
        providers: defaultProvider === "auto" ? [] : [defaultProvider],
    },
];

const getModelEntry = (model: AvailableModel) => [model.id, model] as const;

const parseReceiptItem = (entry: unknown, index: number): ReceiptItem => {
    if (!entry || typeof entry !== "object") {
        throw new Error(`Receipt item at index ${index} must be an object.`);
    }

    const item = (entry as { name?: unknown }).name;
    const price = (entry as { price?: unknown }).price;

    if (typeof item !== "string" || !item.trim()) {
        throw new Error(`Receipt item at index ${index} is missing a valid item name.`);
    }

    if (typeof price !== "number") {
        throw new Error(`Receipt item at index ${index} is missing a numeric price.`);
    }

    return {
        item: item.trim(),
        price,
    } satisfies ReceiptItem;
};

export const dropdownAvailableModels: AvailableModel[] = Array.from(
    new Map(
        [
            ...fallbackAvailableModels,
            {
                id: additionalDropdownModelId,
                label: "Qwen3-VL-8B-Instruct",
                providers: [],
            },
        ].map(getModelEntry),
    ).values(),
);

export const receiptPrompt = `Extract all purchased items from this receipt.

Return a JSON list in this format:
[{"name": "item name", "price": 1.99}, ...]

Make sure to:

- Normalize item names (e.g., BNNS -> bananas)
- Exclude totals, taxes, discounts
- Prices must be numbers (e.g., 1.99)`;

export const resolveRequestedModelId = (options: {
    manualModelId?: unknown;
    selectedModelId?: unknown;
    useEnvModelId?: boolean;
}): string => {
    if (options.useEnvModelId) {
        return defaultModelId;
    }

    const manualModelId = sanitizeModelId(options.manualModelId);
    if (manualModelId) {
        return manualModelId;
    }

    return sanitizeModelId(options.selectedModelId) ?? defaultModelId;
};

export const buildDataUrl = (bytes: ArrayBuffer, mimeType: string): string => {
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mimeType};base64,${base64}`;
};



export const parseReceiptItems = (rawResponse: string): ReceiptItem[] => {
    const parsed = JSON.parse(rawResponse) as unknown;

    if (!Array.isArray(parsed)) {
        throw new Error("Model response must be a JSON array.");
    }

    return parsed.map(parseReceiptItem);
};
