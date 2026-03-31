export const groceryCategories = [
    "produce",
    "dairy",
    "bakery",
    "meat",
    "pantry",
    "frozen",
    "beverages",
    "snacks",
    "household",
    "personal-care",
    "other",
] as const;

export type GroceryCategory = (typeof groceryCategories)[number];

export type ReceiptItem = {
    item: string;
    normalizedItem: string;
    category: GroceryCategory;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
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

const groceryCategorySet = new Set<GroceryCategory>(groceryCategories);

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
    const category = (entry as { category?: unknown }).category;
    const quantity = (entry as { quantity?: unknown }).quantity;
    const unitPrice = (entry as { unitPrice?: unknown }).unitPrice;
    const lineTotal = (entry as { lineTotal?: unknown; price?: unknown }).lineTotal ??
        (entry as { price?: unknown }).price;

    if (typeof item !== "string" || !item.trim()) {
        throw new Error(`Receipt item at index ${index} is missing a valid item name.`);
    }

    const parsedCategory = sanitizeCategory(category);
    if (!parsedCategory) {
        throw new Error(`Receipt item at index ${index} is missing a valid category.`);
    }

    const parsedQuantity = sanitizePositiveNumber(quantity) ?? 1;
    const parsedLineTotal = sanitizePositiveNumber(lineTotal);
    const parsedUnitPrice = sanitizePositiveNumber(unitPrice);

    if (parsedLineTotal === null && parsedUnitPrice === null) {
        throw new Error(
            `Receipt item at index ${index} is missing a numeric line total or unit price.`,
        );
    }

    const resolvedLineTotal = parsedLineTotal ?? Number((parsedUnitPrice! * parsedQuantity).toFixed(2));
    const resolvedUnitPrice = parsedUnitPrice ?? Number((resolvedLineTotal / parsedQuantity).toFixed(2));

    return {
        item: item.trim(),
        normalizedItem: normalizeItemName(item),
        category: parsedCategory,
        quantity: parsedQuantity,
        unitPrice: resolvedUnitPrice,
        lineTotal: resolvedLineTotal,
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

export const buildReceiptPrompt = () => `Extract all grocery items from this receipt.

Return a JSON object in this format:
{
    "items": [
        {
            "name": "item name",
            "category": "produce",
            "quantity": 2,
            "unitPrice": 1.99,
            "lineTotal": 3.98
        }
    ]
}

Allowed categories:
${groceryCategories.map((category) => `- ${category}`).join("\n")}

Rules:
- Only include purchased grocery or household items.
- Exclude totals, taxes, discounts, loyalty lines, and payment rows.
- Normalize abbreviated names into readable grocery names.
- quantity must be a positive number. Use 1 when uncertain.
- unitPrice and lineTotal must be numbers.
- category must be one of the allowed categories.`;

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

const sanitizePositiveNumber = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return null;
    }

    return Number(value.toFixed(2));
};

export const normalizeItemName = (value: string): string => {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

export const formatCategoryLabel = (category: GroceryCategory): string => {
    return category
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

export const sanitizeCategory = (value: unknown): GroceryCategory | null => {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim().toLowerCase().replace(/\s+/g, "-") as GroceryCategory;
    return groceryCategorySet.has(normalized) ? normalized : null;
};

const extractJsonPayload = (rawResponse: string): string => {
    const trimmed = rawResponse.trim();
    if (!trimmed) {
        throw new Error("Model response was empty.");
    }

    const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim();
    }

    const openingIndex = trimmed.search(/[{\[]/);
    if (openingIndex === -1) {
        return trimmed;
    }

    let depth = 0;
    let startIndex = -1;
    let inString = false;
    let isEscaped = false;

    for (let index = openingIndex; index < trimmed.length; index += 1) {
        const char = trimmed[index];

        if (inString) {
            if (isEscaped) {
                isEscaped = false;
                continue;
            }

            if (char === "\\") {
                isEscaped = true;
                continue;
            }

            if (char === "\"") {
                inString = false;
            }

            continue;
        }

        if (char === "\"") {
            inString = true;
            continue;
        }

        if (char === "{" || char === "[") {
            if (startIndex === -1) {
                startIndex = index;
            }

            depth += 1;
            continue;
        }

        if (char === "}" || char === "]") {
            depth -= 1;
            if (depth === 0 && startIndex !== -1) {
                return trimmed.slice(startIndex, index + 1);
            }
        }
    }

    return trimmed.slice(openingIndex);
};

const isLikelyJsonStringTerminator = (source: string, index: number): boolean => {
    for (let lookAhead = index + 1; lookAhead < source.length; lookAhead += 1) {
        const nextChar = source[lookAhead];
        if (/\s/.test(nextChar)) {
            continue;
        }

        return [",", "}", "]", ":"].includes(nextChar);
    }

    return true;
};

const repairJsonStringLiterals = (source: string): string => {
    let repaired = "";
    let inString = false;
    let isEscaped = false;

    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];

        if (!inString) {
            if (char === "\"") {
                inString = true;
            }

            repaired += char;
            continue;
        }

        if (isEscaped) {
            repaired += char;
            isEscaped = false;
            continue;
        }

        if (char === "\\") {
            repaired += char;
            isEscaped = true;
            continue;
        }

        if (char === "\"") {
            if (isLikelyJsonStringTerminator(source, index)) {
                repaired += char;
                inString = false;
            } else {
                repaired += "\\\"";
            }

            continue;
        }

        if (char === "\n") {
            repaired += "\\n";
            continue;
        }

        if (char === "\r") {
            repaired += "\\r";
            continue;
        }

        if (char === "\t") {
            repaired += "\\t";
            continue;
        }

        repaired += char;
    }

    return repaired;
};

const parseReceiptJson = (rawResponse: string): unknown => {
    const jsonPayload = extractJsonPayload(rawResponse);

    try {
        return JSON.parse(jsonPayload) as unknown;
    } catch (initialError) {
        const repairedPayload = repairJsonStringLiterals(jsonPayload);

        try {
            return JSON.parse(repairedPayload) as unknown;
        } catch {
            const message =
                initialError instanceof Error ? initialError.message : "Unknown JSON parsing error.";
            throw new Error(`Unable to parse model JSON response: ${message}`);
        }
    }
};

export const parseReceiptItems = (rawResponse: string): ReceiptItem[] => {
    const parsed = parseReceiptJson(rawResponse);
    const items = Array.isArray(parsed)
        ? parsed
        : (parsed as { items?: unknown }).items;

    if (!Array.isArray(items)) {
        throw new Error("Model response must be a JSON object with an items array.");
    }

    return items.map(parseReceiptItem);
};
