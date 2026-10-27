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
        expect(
            isImageReceiptUpload({ name: "receipt.svg", type: "image/svg+xml" }),
        ).toBe(false);
        expect(
            isImageReceiptUpload({ name: "receipt.svg", type: "image/svg+xml; charset=utf-8" }),
        ).toBe(false);
        expect(
            isImageReceiptUpload({ name: "receipt.svg", type: "image/svg" }),
        ).toBe(false);
        expect(
            isImageReceiptUpload({ name: "vector.svgz", type: "image/svgz" }),
        ).toBe(false);
        expect(
            isImageReceiptUpload({ name: "receipt.svg", type: "" }),
        ).toBe(false);
        expect(
            isSupportedReceiptUpload({ name: "receipt.svg", type: "image/svg+xml" }),
        ).toBe(false);
        expect(
            isSupportedReceiptUpload({ name: "receipt.png", type: "image/svg+xml; charset=utf-8" }),
        ).toBe(false);
    });

    it("merges multi-page receipt extractions by concatenating page items and preserving purchaseDate", () => {
        const merged = mergeReceiptExtractions([
            {
                currencyCode: "EUR",
                purchaseDate: "2026-04-12",
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
                purchaseDate: null,
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
        expect(merged.purchaseDate).toBe("2026-04-12");
        expect(merged.items).toHaveLength(2);
        expect(merged.items.map((item) => item.item)).toEqual(["Milk", "Bread"]);
    });
});