import { legacyDefaultCurrencyCode } from "@/lib/currency";
import type {
    ExtractedReceipt,
    GroceriesMonthPayload,
    GroceryCategorySummary,
    GroceryEntry,
    MonthOption,
} from "@/lib/groceries";
import type { AvailableModel, ReceiptItem } from "@/lib/receipt";

export const makeReceiptItem = (
    overrides: Partial<ReceiptItem> = {},
): ReceiptItem => ({
    item: "Milk",
    normalizedItem: "milk",
    category: "dairy",
    quantity: 2,
    unitPrice: 3.5,
    lineTotal: 7,
    ...overrides,
});

export const makeEntry = (
    overrides: Partial<GroceryEntry> = {},
): GroceryEntry => ({
    currencyCode: legacyDefaultCurrencyCode,
    id: "entry-1",
    receiptId: "receipt-1",
    sourceFileName: "receipt.png",
    modelId: "test-model",
    purchaseDate: "2026-04-10T00:00:00.000Z",
    createdAt: "2026-04-10T00:00:00.000Z",
    ...makeReceiptItem(),
    ...overrides,
});

export const makeCategorySummary = (
    overrides: Partial<GroceryCategorySummary> = {},
): GroceryCategorySummary => ({
    category: "dairy",
    label: "Dairy",
    total: 7,
    itemCount: 2,
    uniqueItemCount: 1,
    share: 0.5,
    groups: [
        {
            normalizedItem: "milk",
            item: "Milk",
            quantity: 2,
            unitPrice: 3.5,
            total: 7,
            entries: [makeEntry()],
        },
    ],
    ...overrides,
});

export const makeExtractedReceipt = (
    overrides: Partial<ExtractedReceipt> = {},
): ExtractedReceipt => ({
    currencyCode: legacyDefaultCurrencyCode,
    id: "receipt-1",
    month: "2026-04",
    sourceFileName: "receipt.png",
    modelId: "test-model",
    extractedAt: "2026-04-10T12:00:00.000Z",
    itemCount: 2,
    total: 7,
    categories: ["dairy"],
    items: [makeReceiptItem()],
    ...overrides,
});

export const makeMonthPayload = (
    overrides: Partial<GroceriesMonthPayload> = {},
): GroceriesMonthPayload => ({
    currencyCode: legacyDefaultCurrencyCode,
    month: "2026-04",
    summary: {
        total: 14,
        itemCount: 4,
        uniqueItemCount: 2,
        receiptCount: 2,
        categoryCount: 2,
    },
    categories: [
        makeCategorySummary(),
        makeCategorySummary({
            category: "produce",
            label: "Produce",
            total: 7,
            itemCount: 2,
            uniqueItemCount: 1,
            share: 0.5,
            groups: [
                {
                    normalizedItem: "apple",
                    item: "Apple",
                    quantity: 2,
                    unitPrice: 3.5,
                    total: 7,
                    entries: [
                        makeEntry({
                            id: "entry-2",
                            category: "produce",
                            item: "Apple",
                            normalizedItem: "apple",
                        }),
                    ],
                },
            ],
        }),
    ],
    entries: [makeEntry(), makeEntry({ id: "entry-2", category: "produce" })],
    extractedReceipts: [makeExtractedReceipt()],
    ...overrides,
});

export const monthOptions: MonthOption[] = [
    { value: "2026-04", label: "April 2026" },
    { value: "2026-03", label: "March 2026" },
];

export const availableModels: AvailableModel[] = [
    { id: "test-model", label: "Test Model", providers: [] },
    { id: "backup-model", label: "Backup Model", providers: [] },
];