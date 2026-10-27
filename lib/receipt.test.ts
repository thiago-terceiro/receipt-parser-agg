import {
    getModelCapabilityHint,
    parseMaxOutputTokens,
    parseReceiptExtraction,
    parseReceiptItems,
} from "@/lib/receipt";

describe("receipt helpers", () => {
    test("falls back when max output tokens are invalid", () => {
        expect(parseMaxOutputTokens(undefined)).toBe(1600);
        expect(parseMaxOutputTokens("not-a-number")).toBe(1600);
        expect(parseMaxOutputTokens("0")).toBe(1600);
    });

    test("caps configured max output tokens", () => {
        expect(parseMaxOutputTokens("2048")).toBe(2048);
        expect(parseMaxOutputTokens("999999")).toBe(4096);
    });

    test("flags model ids that do not look vision-capable", () => {
        expect(getModelCapabilityHint("Qwen/Qwen3.5-9B")).toContain(
            "does not look vision-capable",
        );
        expect(
            getModelCapabilityHint("Qwen/Qwen2.5-VL-7B-Instruct"),
        ).toBeNull();
        expect(getModelCapabilityHint("gemini-flash-latest")).toBeNull();
        expect(getModelCapabilityHint("gemini-3.8-flash")).toBeNull();
    });

    test("surfaces truncation hints for incomplete json", () => {
        expect(() => parseReceiptItems('{"items": [')).toThrow(
            "The model output may have been truncated; increase HF_MAX_OUTPUT_TOKENS.",
        );
    });

    test("parses a full extraction with currency code", () => {
        expect(
            parseReceiptExtraction(
                JSON.stringify({
                    currencyCode: "EUR",
                    items: [
                        {
                            name: "Milk",
                            category: "dairy",
                            quantity: 2,
                            unitPrice: 3.5,
                            lineTotal: 7,
                        },
                    ],
                }),
            ),
        ).toEqual({
            currencyCode: "EUR",
            purchaseDate: null,
            items: [
                {
                    item: "Milk",
                    normalizedItem: "milk",
                    category: "dairy",
                    quantity: 2,
                    unitPrice: 3.5,
                    lineTotal: 7,
                },
            ],
        });
    });

    test("parses extraction with purchase date", () => {
        expect(
            parseReceiptExtraction(
                JSON.stringify({
                    currencyCode: "USD",
                    purchaseDate: "2026-04-15",
                    items: [
                        {
                            name: "Apples",
                            category: "produce",
                            quantity: 1,
                            unitPrice: 4.99,
                            lineTotal: 4.99,
                        },
                    ],
                }),
            ),
        ).toEqual({
            currencyCode: "USD",
            purchaseDate: "2026-04-15",
            items: [
                {
                    item: "Apples",
                    normalizedItem: "apples",
                    category: "produce",
                    quantity: 1,
                    unitPrice: 4.99,
                    lineTotal: 4.99,
                },
            ],
        });
    });

    test("handles invalid and impossible purchase dates gracefully", () => {
        const createPayload = (purchaseDate: unknown) =>
            JSON.stringify({
                currencyCode: "USD",
                purchaseDate,
                items: [
                    {
                        name: "Apples",
                        category: "produce",
                        quantity: 1,
                        unitPrice: 4.99,
                        lineTotal: 4.99,
                    },
                ],
            });

        // Impossible calendar dates must evaluate to null purchaseDate
        expect(parseReceiptExtraction(createPayload("2026-02-31")).purchaseDate).toBeNull();
        expect(parseReceiptExtraction(createPayload("2026-02-29")).purchaseDate).toBeNull(); // 2026 is not leap
        expect(parseReceiptExtraction(createPayload("2026-04-31")).purchaseDate).toBeNull(); // April has 30 days
        expect(parseReceiptExtraction(createPayload("invalid-date")).purchaseDate).toBeNull();
        expect(parseReceiptExtraction(createPayload("")).purchaseDate).toBeNull();

        // Valid leap year date must be accepted
        expect(parseReceiptExtraction(createPayload("2024-02-29")).purchaseDate).toBe("2024-02-29");
    });
});