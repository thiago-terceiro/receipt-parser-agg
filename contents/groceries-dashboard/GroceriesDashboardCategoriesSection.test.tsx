import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";


import { GroceriesDashboardCategoriesSection } from "@/contents/groceries-dashboard/GroceriesDashboardCategoriesSection";
import type { GroceryCategorySummary } from "@/lib/groceries";
import { makeCategorySummary } from "@/test/fixtures";
import { createTestTranslations } from "@/test/mock-state";

import type { PropsWithChildren } from "react";

type MockCategorySummaryCardProps = {
    category: GroceryCategorySummary;
    onSelect: (category: GroceryCategorySummary) => void;
};

type MockCategoryDetailsProps = PropsWithChildren<{
    categoryLabel: string;
    className?: string;
}>;

jest.mock("@/contents/groceries-dashboard/GroceriesDashboardParts", () => ({
    CategorySummaryCard: ({ category, onSelect }: MockCategorySummaryCardProps) => (
        <button onClick={() => onSelect(category)}>{category.category}</button>
    ),
    MemoizedCategoryDetails: ({ categoryLabel, className }: MockCategoryDetailsProps) => (
        <div className={className}>details:{categoryLabel}</div>
    ),
}));

describe("GroceriesDashboardCategoriesSection", () => {
    const categories = [makeCategorySummary()];
    const translations = createTestTranslations();
    const currencyFormatter = new Intl.NumberFormat("en", {
        style: "currency",
        currency: "USD",
    });
    const percentFormatter = new Intl.NumberFormat("en", {
        style: "percent",
        maximumFractionDigits: 0,
    });

    it("renders the active details and mobile dialog", () => {
        render(
            <GroceriesDashboardCategoriesSection
                categories={categories}
                activeCategory="dairy"
                active={categories[0]}
                activeCategoryLabel="Dairy"
                isMobileDetailOpen
                translations={translations}
                currencyFormatter={currencyFormatter}
                percentFormatter={percentFormatter}
                onSelectCategory={jest.fn()}
                onMobileDialogOpenChange={jest.fn()}
            />,
        );

        expect(screen.getAllByText("details:Dairy").length).toBeGreaterThan(0);
        expect(screen.getByText("groceries.mobileDescription")).toBeInTheDocument();
    });

    it("delegates category selection", async () => {
        const onSelectCategory = jest.fn();

        render(
            <GroceriesDashboardCategoriesSection
                categories={categories}
                activeCategory="dairy"
                active={categories[0]}
                activeCategoryLabel="Dairy"
                isMobileDetailOpen={false}
                translations={translations}
                currencyFormatter={currencyFormatter}
                percentFormatter={percentFormatter}
                onSelectCategory={onSelectCategory}
                onMobileDialogOpenChange={jest.fn()}
            />,
        );

        await userEvent.click(screen.getByRole("button", { name: "dairy" }));

        expect(onSelectCategory).toHaveBeenCalledWith(categories[0]);
    });
});