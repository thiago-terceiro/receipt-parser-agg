import { render, screen } from "@testing-library/react";

import { GroceriesDashboardEmptyState } from "@/contents/groceries-dashboard/GroceriesDashboardEmptyState";
import { createTestTranslations } from "@/test/mock-state";

describe("GroceriesDashboardEmptyState", () => {
    it("renders the empty state copy and upload link", () => {
        const translations = createTestTranslations();

        render(
            <GroceriesDashboardEmptyState
                month="2026-04"
                locale="en"
                translations={translations}
            />,
        );

        expect(screen.getByText("groceries.emptyTitle")).toBeInTheDocument();
        expect(
            screen.getByText(/groceries.emptyDescription/),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "groceries.extractReceipt" })).toHaveAttribute(
            "href",
            "/en",
        );
    });
});