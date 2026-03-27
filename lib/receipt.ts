export type ReceiptItem = {
    item: string;
    price: number;
};

export type AvailableModel = {
    id: string;
    label: string;
    providers: string[];
};

export const defaultModelId =
    process.env.HF_MODEL_ID ?? "Qwen/Qwen2.5-VL-7B-Instruct";

export const defaultProvider = process.env.HF_PROVIDER?.trim() || "auto";

export const fallbackAvailableModels: AvailableModel[] = [
    {
        id: defaultModelId,
        label: defaultModelId,
        providers: [defaultProvider],
    },
    {
        id: "Qwen/Qwen2-VL-7B-Instruct",
        label: "Qwen/Qwen2-VL-7B-Instruct",
        providers: [defaultProvider],
    },
    {
        id: "meta-llama/Llama-3.2-11B-Vision-Instruct",
        label: "meta-llama/Llama-3.2-11B-Vision-Instruct",
        providers: [defaultProvider],
    },
    {
        id: "Qwen/Qwen3.5-9B",
        label: "Qwen/Qwen3.5-9B",
        providers: [defaultProvider],
    },
];

export const receiptPrompt = `Extract all purchased items from this receipt.

Return ONLY valid JSON:
[
  { "item": "name", "price": number }
]

- Normalize item names (e.g., BNNS -> bananas)
- Exclude totals, taxes, discounts
- Prices must be numbers (e.g., 1.99)
- No text outside JSON`;

export function buildDataUrl(bytes: ArrayBuffer, mimeType: string): string {
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mimeType};base64,${base64}`;
}

function extractJsonSegment(rawResponse: string): string {
    const trimmed = rawResponse.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        return trimmed;
    }

    const startIndex = trimmed.indexOf("[");
    const endIndex = trimmed.lastIndexOf("]");
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        throw new Error("Model response did not contain a JSON array.");
    }

    return trimmed.slice(startIndex, endIndex + 1);
}

export function parseReceiptItems(rawResponse: string): ReceiptItem[] {
    const payload = extractJsonSegment(rawResponse);
    const parsed = JSON.parse(payload) as unknown;

    if (!Array.isArray(parsed)) {
        throw new Error("Model response must be a JSON array.");
    }

    return parsed.map((entry, index) => {
        if (!entry || typeof entry !== "object") {
            throw new Error(`Receipt item at index ${index} must be an object.`);
        }

        const item = (entry as { item?: unknown }).item;
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
    });
}
