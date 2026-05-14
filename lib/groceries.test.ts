import { buildGroceriesMonthPayload } from "@/lib/groceries";
import { makeEntry, makeExtractedReceipt } from "@/test/fixtures";

describe("groceries payload helpers", () => {
    it("builds recent receipt cards from saved entries", () => {
        const payload = buildGroceriesMonthPayload(
            "2026-04",
            [
                makeEntry({
                    id: "entry-1",
                    receiptId: "receipt-1",
                    item: "Milk",
                    normalizedItem: "milk",
                    category: "dairy",
                    lineTotal: 7,
                }),
                makeEntry({
                    id: "entry-2",
                    receiptId: "receipt-1",
                    item: "Apple",
                    normalizedItem: "apple",
                    category: "produce",
                    lineTotal: 3,
                    quantity: 1,
                }),
            ],
            [makeExtractedReceipt({ id: "unrelated-receipt" })],
        );

        expect(payload.summary.receiptCount).toBe(1);
        expect(payload.currencyCode).toBe("USD");
        expect(payload.extractedReceipts).toEqual([
            expect.objectContaining({
                currencyCode: "USD",
                id: "receipt-1",
                itemCount: 2,
                total: 10,
                categories: ["dairy", "produce"],
            }),
        ]);
    });

    it("rejects mixed currencies inside the same month payload", () => {
        expect(() =>
            buildGroceriesMonthPayload("2026-04", [
                makeEntry({ currencyCode: "USD" }),
                makeEntry({
                    id: "entry-2",
                    receiptId: "receipt-2",
                    currencyCode: "EUR",
                }),
            ]),
        ).toThrow("Groceries saved in the same month must use a single currency.");
    });
});