import {
    isImageReceiptUpload,
    isPdfReceiptFileName,
    isPdfReceiptUpload,
    isSupportedReceiptUpload,
    mergeReceiptExtractions,
    receiptUploadAccept,
} from "@/lib/receipt-upload";

describe("receipt upload helpers", () => {
    it("recognizes supported receipt upload types", () => {
        expect(receiptUploadAccept).toBe("image/*,application/pdf");
        expect(
            isImageReceiptUpload({ name: "receipt.png", type: "image/png" }),
        ).toBe(true);
        expect(
            isPdfReceiptUpload({ name: "receipt.pdf", type: "application/pdf" }),
        ).toBe(true);
        expect(
            isPdfReceiptUpload({ name: "receipt.pdf", type: "" }),
        ).toBe(true);
        expect(isPdfReceiptFileName("receipt.pdf")).toBe(true);
        expect(
            isSupportedReceiptUpload({ name: "notes.txt", type: "text/plain" }),
        ).toBe(false);
    });

    it("merges multi-page receipt extractions by concatenating page items", () => {
        const merged = mergeReceiptExtractions([
            {
                currencyCode: "EUR",
                items: [
                    {
                        item: "Milk",
                        normalizedItem: "milk",
                        category: "dairy",
                        quantity: 1,
                        unitPrice: 2.5,
                        lineTotal: 2.5,
                    },
                ],
            },
            {
                currencyCode: "EUR",
                items: [
                    {
                        item: "Bread",
                        normalizedItem: "bread",
                        category: "bakery",
                        quantity: 2,
                        unitPrice: 1.5,
                        lineTotal: 3,
                    },
                ],
            },
        ]);

        expect(merged.currencyCode).toBe("EUR");
        expect(merged.items).toHaveLength(2);
        expect(merged.items.map((item) => item.item)).toEqual(["Milk", "Bread"]);
    });
});