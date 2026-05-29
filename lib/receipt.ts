import { jsonrepair } from "jsonrepair";

import type { CurrencyCode } from "@/lib/currency";
import { sanitizeCurrencyCode } from "@/lib/currency";

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

export const receiptItemsJsonSchema = {
  name: "ReceiptItems",
  strict: true,
  schema: {
    type: "object",
    properties: {
      currencyCode: {
        type: "string",
        pattern: "^[A-Z]{3}$",
      },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            category: {
              type: "string",
              enum: [...groceryCategories],
            },
            quantity: { type: "number" },
            unitPrice: { type: "number" },
            lineTotal: { type: "number" },
          },
          required: ["name", "category", "quantity", "unitPrice", "lineTotal"],
        },
      },
    },
    additionalProperties: false,
    required: ["currencyCode", "items"],
  },
} as const;

export type GroceryCategory = (typeof groceryCategories)[number];

export type ReceiptItem = {
  item: string;
  normalizedItem: string;
  category: GroceryCategory;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ParsedReceiptExtraction = {
  currencyCode: CurrencyCode;
  items: ReceiptItem[];
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
const fallbackMaxOutputTokens = 1600;
const maxOutputTokensUpperBound = 4096;

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

  if (
    trimmed.startsWith("/") ||
    trimmed.endsWith("/") ||
    trimmed.includes("//")
  ) {
    return null;
  }

  return trimmed;
};

export const defaultModelId =
  sanitizeModelId(process.env.HF_MODEL_ID) ?? fallbackModelId;

export const defaultProvider = process.env.HF_PROVIDER?.trim() || "auto";

export const parseMaxOutputTokens = (
  value: unknown,
  fallback = fallbackMaxOutputTokens,
): number => {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value.trim(), 10)
        : Number.NaN;

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.min(parsedValue, maxOutputTokensUpperBound);
};

export const defaultMaxOutputTokens = parseMaxOutputTokens(
  process.env.HF_MAX_OUTPUT_TOKENS,
);

export const fallbackAvailableModels: AvailableModel[] = [
  {
    id: defaultModelId,
    label: `${defaultModelId} (env default)`,
    providers: defaultProvider === "auto" ? [] : [defaultProvider],
  },
];

const getModelEntry = (model: AvailableModel) => [model.id, model] as const;

export const isLikelyVisionModelId = (modelId: string): boolean =>
  /(^|[/-])(vl|vision|llava|internvl|pixtral|idefics|minicpm-v)([/-]|$)/i.test(
    modelId,
  );

export const getModelCapabilityHint = (modelId: string): string | null => {
  if (isLikelyVisionModelId(modelId)) {
    return null;
  }

  return (
    `Configured model ${modelId} does not look vision-capable. ` +
    "Use a VL or vision model for receipt images."
  );
};

const parseReceiptItem = (entry: unknown, index: number): ReceiptItem => {
  if (!entry || typeof entry !== "object") {
    throw new Error(`Receipt item at index ${index} must be an object.`);
  }

  const item =
    (entry as { name?: unknown; item?: unknown }).name ??
    (entry as { item?: unknown }).item;
  const category = (entry as { category?: unknown }).category;
  const quantity = (entry as { quantity?: unknown }).quantity;
  const unitPrice = (entry as { unitPrice?: unknown }).unitPrice;
  const lineTotal =
    (entry as { lineTotal?: unknown; price?: unknown }).lineTotal ??
    (entry as { price?: unknown }).price;

  if (typeof item !== "string" || !item.trim()) {
    throw new Error(
      `Receipt item at index ${index} is missing a valid item name.`,
    );
  }

  const parsedCategory = sanitizeCategory(category);
  if (!parsedCategory) {
    throw new Error(
      `Receipt item at index ${index} is missing a valid category.`,
    );
  }

  const parsedQuantity = sanitizePositiveNumber(quantity) ?? 1;
  const parsedLineTotal = sanitizePositiveNumber(lineTotal);
  const parsedUnitPrice = sanitizePositiveNumber(unitPrice);

  if (parsedLineTotal === null && parsedUnitPrice === null) {
    throw new Error(
      `Receipt item at index ${index} is missing a numeric line total or unit price.`,
    );
  }

  const resolvedLineTotal =
    parsedLineTotal ?? Number((parsedUnitPrice! * parsedQuantity).toFixed(2));
  const resolvedUnitPrice =
    parsedUnitPrice ?? Number((resolvedLineTotal / parsedQuantity).toFixed(2));

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

export const buildReceiptPrompt =
  () => `Extract all grocery items from this receipt.

Return a JSON object in this format:
{
  "currencyCode": "EUR",
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
- currencyCode must be the 3-letter ISO 4217 code shown or implied by the receipt total, such as USD, EUR, or BRL.
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

export const buildDataUrl = (
  bytes: ArrayBuffer | Uint8Array,
  mimeType: string,
): string => {
  const normalizedBytes =
    bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  const base64 = Buffer.from(normalizedBytes).toString("base64");
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

export const formatCategoryLabel = (
  category: GroceryCategory,
  labels?: Partial<Record<GroceryCategory, string>>,
): string => {
  const translatedLabel = labels?.[category];
  if (translatedLabel) {
    return translatedLabel;
  }

  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const sanitizeCategory = (value: unknown): GroceryCategory | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") as GroceryCategory;
  return groceryCategorySet.has(normalized) ? normalized : null;
};

const parseReceiptJson = (rawResponse: string): unknown => {
  const trimmed = rawResponse.trim();
  if (!trimmed) {
    throw new Error("Model response was empty.");
  }

  // Extract JSON from code fences if present.
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonStr = fencedMatch?.[1] ?? trimmed;

  // Find JSON boundaries.
  const jsonStart = jsonStr.search(/[{\[]/);
  if (jsonStart === -1) {
    throw new Error("No JSON found in response.");
  }

  // Extract from first { or [ to last } or ].
  const jsonEnd = Math.max(jsonStr.lastIndexOf("}"), jsonStr.lastIndexOf("]"));
  if (jsonEnd === -1) {
    throw new Error(
      "Incomplete JSON in response. The model output may have been truncated; increase HF_MAX_OUTPUT_TOKENS.",
    );
  }

  const extracted = jsonStr.slice(jsonStart, jsonEnd + 1).trim();

  try {
    return JSON.parse(extracted) as unknown;
  } catch (initialError) {
    try {
      return JSON.parse(jsonrepair(extracted)) as unknown;
    } catch {
      const message =
        initialError instanceof Error
          ? initialError.message
          : "Unknown JSON parsing error.";
      throw new Error(`Unable to parse model JSON response: ${message}`);
    }
  }
};

export const parseReceiptExtraction = (
  rawResponse: string,
): ParsedReceiptExtraction => {
  const parsed = parseReceiptJson(rawResponse);
  const extraction = Array.isArray(parsed)
    ? null
    : (parsed as { currencyCode?: unknown; items?: unknown });
  const items = Array.isArray(parsed) ? parsed : extraction?.items;

  if (!Array.isArray(items)) {
    throw new Error(
      "Model response must be a JSON object with an items array.",
    );
  }

  const currencyCode = sanitizeCurrencyCode(extraction?.currencyCode);
  if (!currencyCode) {
    throw new Error(
      "Model response must include a valid currencyCode using a 3-letter ISO 4217 code.",
    );
  }

  return {
    currencyCode,
    items: items.map(parseReceiptItem),
  };
};

export const parseReceiptItems = (rawResponse: string): ReceiptItem[] => {
  return parseReceiptExtraction(rawResponse).items;
};

export const sanitizeReceiptItems = (value: unknown): ReceiptItem[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.map((entry, index) => parseReceiptItem(entry, index));
};
