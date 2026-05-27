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

const secondaryBoard = {
    archivedAt: null,
    createdAt: "2026-04-02T00:00:00.000Z",
    id: "2a9af65a-8335-4b90-91dc-40bd4a78f068",
    joinedAt: "2026-04-02T00:00:00.000Z",
    name: "Trip board",
    ownerUserId: "user-1",
    role: "owner" as const,
    updatedAt: "2026-04-02T00:00:00.000Z",
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
    statCards: Array<{
        label: string;
        value: string;
    }>;
};

type MockRecentProps = {
    boardId: string;
    receipts: unknown[];
};

type MockCategoriesProps = {
    categories: GroceryCategorySummary[];
    isMobileDetailOpen: boolean;
    onSelectCategory: (category: GroceryCategorySummary) => void;
};

type MockBoardsPanelProps = {
    activeBoard: {
        name: string;
    };
    isBoardSwitchPending?: boolean;
    onBoardActivated: (boardId: string) => void;
};

const createLocalStorageStore = () => {
    const storage = new Map<string, string>();

    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) =>
        storage.get(key) ?? null,
    );
    (window.localStorage.setItem as jest.Mock).mockImplementation(
        (key: string, value: string) => {
            storage.set(key, value);
        },
    );
    (window.localStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
        storage.delete(key);
    });
    (window.localStorage.clear as jest.Mock).mockImplementation(() => {
        storage.clear();
    });
    (window.localStorage.key as jest.Mock).mockImplementation((index: number) => {
        return Array.from(storage.keys())[index] ?? null;
    });

    return storage;
};

jest.mock("@/contents/groceries-dashboard/GroceriesDashboardSummarySection", () => ({
    GroceriesDashboardSummarySection: ({ onMonthChange, statCards }: MockSummaryProps) => (
        <div>
            <button onClick={() => onMonthChange("2026-03")}>change month</button>
            {statCards.map((stat) => (
                <span key={stat.label}>{`${stat.label}:${stat.value}`}</span>
            ))}
        </div>
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
    GroceriesDashboardBoardsPanel: ({
        activeBoard,
        isBoardSwitchPending,
        onBoardActivated,
    }: MockBoardsPanelProps) => (
        <div>
            <div>{`active-board:${activeBoard.name}`}</div>
            <div>{`switching:${String(Boolean(isBoardSwitchPending))}`}</div>
            <button onClick={() => onBoardActivated("2a9af65a-8335-4b90-91dc-40bd4a78f068")}>
                switch board
            </button>
        </div>
    ),
}));

describe("GroceriesDashboard", () => {
    beforeEach(() => {
        createLocalStorageStore();
        window.localStorage.clear();
    });

    it("pushes a new route when the month changes", async () => {
        render(
            <GroceriesDashboard
                activeBoard={activeBoard}
                boards={[activeBoard, secondaryBoard]}
                payload={makeMonthPayload()}
                currentMonth="2026-04"
                members={members}
                monthOptions={monthOptions}
            />,
        );

        await userEvent.click(screen.getByRole("button", { name: "change month" }));

        expect(mockNavigationState.router.push).toHaveBeenCalledWith(
            {
                pathname: "/groceries",
                query: {
                    board: "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d",
                    month: "2026-03",
                },
            },
        );
        expect(screen.getByText("recent:1")).toBeInTheDocument();
    });

    it("renders the empty state when there are no categories", () => {
        render(
            <GroceriesDashboard
                activeBoard={activeBoard}
                boards={[activeBoard, secondaryBoard]}
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
                boards={[activeBoard, secondaryBoard]}
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

    it("formats tracked item totals as integers in the summary cards", () => {
        render(
            <GroceriesDashboard
                activeBoard={activeBoard}
                boards={[activeBoard, secondaryBoard]}
                payload={makeMonthPayload({
                    summary: {
                        total: 14,
                        itemCount: 150.25999999999996,
                        uniqueItemCount: 2,
                        receiptCount: 2,
                        categoryCount: 2,
                    },
                })}
                currentMonth="2026-04"
                members={members}
                monthOptions={monthOptions}
            />,
        );

        expect(
            screen.getByText("groceries.stats.itemsTracked:150"),
        ).toBeInTheDocument();
    });

    it("formats month totals with the payload currency", () => {
        render(
            <GroceriesDashboard
                activeBoard={activeBoard}
                boards={[activeBoard, secondaryBoard]}
                payload={makeMonthPayload({ currencyCode: "EUR" })}
                currentMonth="2026-04"
                members={members}
                monthOptions={monthOptions}
            />,
        );

        expect(
            screen.getByText("groceries.stats.monthTotal:€14.00"),
        ).toBeInTheDocument();
    });

    it("uses cached board data immediately when switching to a visited board", async () => {
        const cachedBoardRender = render(
            <GroceriesDashboard
                activeBoard={secondaryBoard}
                boards={[activeBoard, secondaryBoard]}
                payload={makeMonthPayload({
                    summary: {
                        total: 48,
                        itemCount: 7,
                        uniqueItemCount: 4,
                        receiptCount: 3,
                        categoryCount: 2,
                    },
                })}
                currentMonth="2026-04"
                members={members}
                monthOptions={monthOptions}
            />,
        );

        expect(screen.getByText("active-board:Trip board")).toBeInTheDocument();
        cachedBoardRender.unmount();

        render(
            <GroceriesDashboard
                activeBoard={activeBoard}
                boards={[activeBoard, secondaryBoard]}
                payload={makeMonthPayload()}
                currentMonth="2026-04"
                members={members}
                monthOptions={monthOptions}
            />,
        );

        expect(screen.getByText("active-board:Home board")).toBeInTheDocument();
        expect(screen.getByText("groceries.stats.monthTotal:$14.00")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "switch board" }));

        expect(mockNavigationState.router.push).toHaveBeenCalledWith({
            pathname: "/groceries",
            query: {
                board: "2a9af65a-8335-4b90-91dc-40bd4a78f068",
            },
        });
        expect(screen.getByText("active-board:Trip board")).toBeInTheDocument();
        expect(screen.getByText("groceries.stats.monthTotal:$48.00")).toBeInTheDocument();
        expect(screen.getByText("switching:false")).toBeInTheDocument();
    });

    it("marks the switch as pending when the target board is not cached", async () => {
        render(
            <GroceriesDashboard
                activeBoard={activeBoard}
                boards={[activeBoard, secondaryBoard]}
                payload={makeMonthPayload()}
                currentMonth="2026-04"
                members={members}
                monthOptions={monthOptions}
            />,
        );

        await userEvent.click(screen.getByRole("button", { name: "switch board" }));

        expect(screen.getByText("switching:true")).toBeInTheDocument();
        expect(screen.getByText("active-board:Home board")).toBeInTheDocument();
    });
});