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
        expect(payload.extractedReceipts).toEqual([
            expect.objectContaining({
                id: "receipt-1",
                itemCount: 2,
                total: 10,
                categories: ["dairy", "produce"],
            }),
        ]);
    });
});