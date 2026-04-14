import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
    CategorySummaryCard,
    MemoizedCategoryDetails,
} from "@/contents/groceries-dashboard/GroceriesDashboardParts";
import { makeCategorySummary } from "@/test/fixtures";
import { createTestTranslations } from "@/test/mock-state";

describe("GroceriesDashboardParts", () => {
    const translations = createTestTranslations();
    const currencyFormatter = new Intl.NumberFormat("en", {
        style: "currency",
        currency: "USD",
    });
    const percentFormatter = new Intl.NumberFormat("en", {
        style: "percent",
        maximumFractionDigits: 0,
    });

    it("renders category details with grouped entries", () => {
        render(
            <MemoizedCategoryDetails
                category={makeCategorySummary()}
                categoryLabel="Dairy"
                translations={translations}
                currencyFormatter={currencyFormatter}
                percentFormatter={percentFormatter}
            />,
        );

        expect(screen.getByText("Dairy")).toBeInTheDocument();
        expect(screen.getByText("Milk")).toBeInTheDocument();
        expect(screen.getAllByText("groceries.table.unitPrice").length).toBeGreaterThan(0);
    });

    it("selects a category from the summary card", async () => {
        const onSelect = jest.fn();

        render(
            <CategorySummaryCard
                category={makeCategorySummary()}
                isActive
                translations={translations}
                currencyFormatter={currencyFormatter}
                percentFormatter={percentFormatter}
                onSelect={onSelect}
            />,
        );

        await userEvent.click(screen.getByRole("button"));

        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ category: "dairy" }),
        );
    });
});