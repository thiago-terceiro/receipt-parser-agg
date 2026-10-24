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
});