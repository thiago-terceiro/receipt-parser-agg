import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GroceriesDashboardRecentReceiptsSection } from "@/contents/groceries-dashboard/GroceriesDashboardRecentReceiptsSection";
import { makeExtractedReceipt } from "@/test/fixtures";
import { createTestTranslations, mockNavigationState } from "@/test/mock-state";

const createResponse = (body: string, ok = true) =>
    ({
        ok,
        text: jest.fn().mockResolvedValue(body),
    }) as unknown as Response;

describe("GroceriesDashboardRecentReceiptsSection", () => {
    const translations = createTestTranslations();
    const currencyFormatter = new Intl.NumberFormat("en", {
        style: "currency",
        currency: "USD",
    });
    const dateTimeFormatter = new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    it("returns nothing when there are no receipts", () => {
        const { container } = render(
            <GroceriesDashboardRecentReceiptsSection
                boardId="board-1"
                receipts={[]}
                translations={translations}
                currencyFormatter={currencyFormatter}
                dateTimeFormatter={dateTimeFormatter}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("renders recent receipt cards", () => {
        render(
            <GroceriesDashboardRecentReceiptsSection
                boardId="board-1"
                receipts={[
                    makeExtractedReceipt(),
                    makeExtractedReceipt({ id: "receipt-2", sourceFileName: null, modelId: null }),
                ]}
                translations={translations}
                currencyFormatter={currencyFormatter}
                dateTimeFormatter={dateTimeFormatter}
            />,
        );

        expect(screen.getByText("groceries.recentExtractions")).toBeInTheDocument();
        expect(screen.getByText("receipt.png")).toBeInTheDocument();
        expect(screen.getByText("groceries.untitledReceipt")).toBeInTheDocument();
        expect(screen.getAllByText(/receipt.total/).length).toBeGreaterThan(0);
    });

    it("deletes a receipt and refreshes the dashboard", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            createResponse(JSON.stringify({ ok: true })),
        ) as jest.Mock;

        render(
            <GroceriesDashboardRecentReceiptsSection
                boardId="board-1"
                receipts={[makeExtractedReceipt()]}
                translations={translations}
                currencyFormatter={currencyFormatter}
                dateTimeFormatter={dateTimeFormatter}
            />,
        );

        await userEvent.click(
            screen.getByRole("button", { name: "groceries.deleteReceipt" }),
        );
        await userEvent.click(
            screen.getByRole("button", { name: "groceries.deleteReceiptConfirm" }),
        );

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/expenses",
                expect.objectContaining({
                    method: "DELETE",
                    body: JSON.stringify({
                        boardId: "board-1",
                        receiptId: "receipt-1",
                    }),
                }),
            );
        });
        expect(mockNavigationState.router.refresh).toHaveBeenCalled();
    });
});