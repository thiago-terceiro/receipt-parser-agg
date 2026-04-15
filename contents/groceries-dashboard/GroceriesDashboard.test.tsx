import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GroceriesDashboard } from "@/contents/groceries-dashboard/GroceriesDashboard";
import type { GroceryCategorySummary } from "@/lib/groceries";
import { makeMonthPayload, monthOptions } from "@/test/fixtures";
import { mockNavigationState } from "@/test/mock-state";

const activeBoard = {
    archivedAt: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    id: "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d",
    joinedAt: "2026-04-01T00:00:00.000Z",
    name: "Home board",
    ownerUserId: "user-1",
    role: "owner" as const,
    updatedAt: "2026-04-01T00:00:00.000Z",
};

const members = [
    {
        boardId: activeBoard.id,
        createdAt: "2026-04-01T00:00:00.000Z",
        displayName: "Owner",
        email: "owner@example.com",
        id: "member-1",
        imageUrl: null,
        joinedAt: "2026-04-01T00:00:00.000Z",
        role: "owner" as const,
        status: "active" as const,
        updatedAt: "2026-04-01T00:00:00.000Z",
        userId: "user-1",
    },
];

type MockSummaryProps = {
    onMonthChange: (month: string) => void;
};

type MockRecentProps = {
    receipts: unknown[];
};

type MockCategoriesProps = {
    categories: GroceryCategorySummary[];
    isMobileDetailOpen: boolean;
    onSelectCategory: (category: GroceryCategorySummary) => void;
};

jest.mock("@/contents/groceries-dashboard/GroceriesDashboardSummarySection", () => ({
    GroceriesDashboardSummarySection: ({ onMonthChange }: MockSummaryProps) => (
        <button onClick={() => onMonthChange("2026-03")}>change month</button>
    ),
}));

jest.mock("@/contents/groceries-dashboard/GroceriesDashboardRecentReceiptsSection", () => ({
    GroceriesDashboardRecentReceiptsSection: ({ receipts }: MockRecentProps) => (
        <div>recent:{receipts.length}</div>
    ),
}));

jest.mock("@/contents/groceries-dashboard/GroceriesDashboardEmptyState", () => ({
    GroceriesDashboardEmptyState: () => <div>empty state</div>,
}));

jest.mock("@/contents/groceries-dashboard/GroceriesDashboardCategoriesSection", () => ({
    GroceriesDashboardCategoriesSection: ({
        categories,
        onSelectCategory,
        isMobileDetailOpen,
    }: MockCategoriesProps) => (
        <div>
            <button onClick={() => onSelectCategory(categories[0])}>select category</button>
            <span>{String(isMobileDetailOpen)}</span>
        </div>
    ),
}));

jest.mock("@/contents/groceries-dashboard/GroceriesDashboardBoardsPanel", () => ({
    GroceriesDashboardBoardsPanel: () => <div>board panel</div>,
}));

describe("GroceriesDashboard", () => {
    it("pushes a new route when the month changes", async () => {
        render(
            <GroceriesDashboard
                activeBoard={activeBoard}
                boards={[activeBoard]}
                payload={makeMonthPayload()}
                currentMonth="2026-04"
                members={members}
                monthOptions={monthOptions}
            />,
        );

        await userEvent.click(screen.getByRole("button", { name: "change month" }));

        expect(mockNavigationState.router.push).toHaveBeenCalledWith(
            "/en/groceries?board=4f6939ce-d5f2-4c08-aecc-a0f0569bb10d&month=2026-03",
        );
        expect(screen.getByText("recent:1")).toBeInTheDocument();
    });

    it("renders the empty state when there are no categories", () => {
        render(
            <GroceriesDashboard
                activeBoard={activeBoard}
                boards={[activeBoard]}
                payload={makeMonthPayload({ categories: [] })}
                currentMonth="2026-04"
                members={members}
                monthOptions={monthOptions}
            />,
        );

        expect(screen.getByText("empty state")).toBeInTheDocument();
    });

    it("opens the mobile detail state when a category is selected on small screens", async () => {
        Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });

        render(
            <GroceriesDashboard
                activeBoard={activeBoard}
                boards={[activeBoard]}
                payload={makeMonthPayload()}
                currentMonth="2026-04"
                members={members}
                monthOptions={monthOptions}
            />,
        );

        expect(screen.getByText("false")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "select category" }));
        expect(screen.getByText("true")).toBeInTheDocument();
    });
});