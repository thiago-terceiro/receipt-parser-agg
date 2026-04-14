import { render, screen } from "@testing-library/react";

import { GroceriesDashboardRecentReceiptsSection } from "@/contents/groceries-dashboard/GroceriesDashboardRecentReceiptsSection";
import { makeExtractedReceipt } from "@/test/fixtures";
import { createTestTranslations } from "@/test/mock-state";

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
});