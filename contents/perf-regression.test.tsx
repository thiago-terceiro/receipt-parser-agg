import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { memo, Profiler, type PropsWithChildren } from "react";

import { GroceriesDashboardBoardsPanel } from "@/contents/groceries-dashboard/GroceriesDashboardBoardsPanel";
import { GroceriesDashboardCategoriesSection } from "@/contents/groceries-dashboard/GroceriesDashboardCategoriesSection";
import { ReceiptWorkspace } from "@/contents/home/ReceiptWorkspace";
import * as receiptLib from "@/lib/receipt";
import { availableModels, makeCategorySummary, makeEntry, makeReceiptItem } from "@/test/fixtures";
import { createTestTranslations, mockAuthState } from "@/test/mock-state";
import { renderWithProviders } from "@/test/render";

let selectRenderCount = 0;
let resultsSectionRenderCount = 0;
let formatCallCount = 0;
let categoryLabelCallCount = 0;

jest.mock("@/lib/currency", () => {
    const actual = jest.requireActual("@/lib/currency");
    return {
        ...actual,
        createCurrencyFormatter: (locale: string, code: string) => {
            const real = actual.createCurrencyFormatter(locale, code);
            return new Proxy(real, {
                get(target, prop, receiver) {
                    if (prop === "format") {
                        return (val: number) => {
                            formatCallCount += 1;
                            return target.format(val);
                        };
                    }
                    return Reflect.get(target, prop, receiver);
                },
            });
        },
    };
});

jest.mock("@/lib/receipt", () => {
    const actual = jest.requireActual("@/lib/receipt");
    return {
        ...actual,
        formatCategoryLabel: (...args: Parameters<typeof receiptLib.formatCategoryLabel>) => {
            categoryLabelCallCount += 1;
            return actual.formatCategoryLabel(...args);
        },
    };
});

jest.mock("@/contents/home/ReceiptWorkspaceResultsSection", () => {
    const actual = jest.requireActual("@/contents/home/ReceiptWorkspaceResultsSection");
    const ActualResultsSection = actual.ReceiptWorkspaceResultsSection;
    const ProfiledResultsSection = memo((props: Record<string, unknown>) => (
        <Profiler
            id="ReceiptWorkspaceResultsSection"
            onRender={() => {
                resultsSectionRenderCount += 1;
            }}
        >
            <ActualResultsSection {...props} />
        </Profiler>
    ));
    ProfiledResultsSection.displayName = "ProfiledResultsSection";
    return {
        ...actual,
        ReceiptWorkspaceResultsSection: ProfiledResultsSection,
    };
});

jest.mock("@/components/ui/select", () => ({
    Select: ({
        children,
        onValueChange,
        value,
        disabled,
    }: PropsWithChildren<{
        disabled?: boolean;
        onValueChange?: (value: string) => void;
        value?: string;
    }>) => {
        selectRenderCount += 1;
        return (
            <select
                aria-label="mock-select"
                disabled={disabled}
                onChange={(event) => onValueChange?.(event.target.value)}
                value={value}
            >
                {children}
            </select>
        );
    },
    SelectContent: ({ children }: PropsWithChildren) => <>{children}</>,
    SelectItem: ({ children, value }: PropsWithChildren<{ value: string }>) => (
        <option value={value}>{children}</option>
    ),
    SelectTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
        <option value="">{placeholder}</option>
    ),
}));

jest.mock("@/components/ui/dialog", () => ({
    Dialog: ({ children, open }: PropsWithChildren<{ open?: boolean }>) =>
        open ? <div>{children}</div> : null,
    DialogContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DialogDescription: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DialogHeader: ({ children }: PropsWithChildren) => <div>{children}</div>,
    DialogTitle: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

const createResponse = (body: string, ok = true) =>
    ({
        ok,
        text: jest.fn().mockResolvedValue(body),
        json: jest.fn().mockResolvedValue(JSON.parse(body || "{}")),
    }) as unknown as Response;

const boardFixtures = [
    {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Home dashboard",
        ownerUserId: "user-1",
        role: "owner" as const,
        joinedAt: "2026-04-01T00:00:00.000Z",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
        archivedAt: null,
    },
    {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Shared dashboard",
        ownerUserId: "user-2",
        role: "editor" as const,
        joinedAt: "2026-04-03T00:00:00.000Z",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: "2026-04-04T00:00:00.000Z",
        archivedAt: null,
    },
];

describe("UI render & INP performance measurements", () => {
    it("measures ReceiptWorkspace row & formatter renders during dialog open/close, date change, and last-item removal", async () => {
        const user = userEvent.setup({ delay: null });
        const items = Array.from({ length: 30 }, (_, idx) =>
            makeReceiptItem({
                item: `Item ${idx + 1}`,
                normalizedItem: `item ${idx + 1}`,
                unitPrice: 2.5,
                quantity: 1,
                lineTotal: 2.5,
            }),
        );

        mockAuthState.status = "authenticated";
        mockAuthState.session = {
            expires: "2026-05-01T00:00:00.000Z",
            user: { email: "person@example.com" },
        };

        global.fetch = jest
            .fn()
            .mockResolvedValueOnce(
                createResponse(
                    JSON.stringify({
                        backend: "hf-api",
                        currencyCode: "EUR",
                        modelId: "test-model",
                        items,
                        rawResponse: "raw",
                    }),
                ),
            )
            .mockResolvedValueOnce(
                createResponse(JSON.stringify({ boards: boardFixtures })),
            );

        const { container } = renderWithProviders(
            <ReceiptWorkspace availableModels={availableModels} />,
            { withWorkspaceProvider: true },
        );

        const input = container.querySelector("input[type='file']") as HTMLInputElement;
        fireEvent.change(input, {
            target: { files: [new File(["image"], "receipt.png", { type: "image/png" })] },
        });
        await waitFor(() => {
            expect(screen.getAllByText("receipt.png").length).toBeGreaterThan(0);
        });

        fireEvent.submit(container.querySelector("form") as HTMLFormElement);
        await screen.findAllByText("Item 1");
        await waitFor(() => {
            expect(screen.getAllByRole("combobox")[1]).not.toBeDisabled();
        });

        // 1. Open and close editor dialog
        resultsSectionRenderCount = 0;
        formatCallCount = 0;
        categoryLabelCallCount = 0;
        await user.click(screen.getAllByRole("button", { name: "receipt.alerts.adjust" })[0]);
        await user.click(screen.getByRole("button", { name: "common.cancel" }));
        const dialogToggleResultsRenders = resultsSectionRenderCount;
        const dialogToggleFormatCalls = formatCallCount;
        const dialogToggleRowRenders = categoryLabelCallCount;

        // 2. Change purchase date
        resultsSectionRenderCount = 0;
        formatCallCount = 0;
        categoryLabelCallCount = 0;
        const dateInput = container.querySelector("#receipt-purchase-date") as HTMLInputElement;
        fireEvent.change(dateInput, { target: { value: "2026-04-20" } });
        const dateChangeResultsRenders = resultsSectionRenderCount;
        const dateChangeFormatCalls = formatCallCount;
        const dateChangeRowRenders = categoryLabelCallCount;

        // 3. Remove the last extracted item (index 29)
        resultsSectionRenderCount = 0;
        formatCallCount = 0;
        categoryLabelCallCount = 0;
        const removeButtons = screen.getAllByRole("button", { name: "receipt.alerts.remove" });
        await user.click(removeButtons[removeButtons.length - 1]);
        await waitFor(() => {
            expect(screen.queryByText("Item 30")).not.toBeInTheDocument();
        });
        const removeLastItemResultsRenders = resultsSectionRenderCount;
        const removeLastItemFormatCalls = formatCallCount;
        const removeLastItemRowRenders = categoryLabelCallCount;

        console.info("[PERF] ReceiptWorkspace", {
            dialogToggleResultsRenders,
            dialogToggleFormatCalls,
            dialogToggleRowRenders,
            dateChangeResultsRenders,
            dateChangeFormatCalls,
            dateChangeRowRenders,
            removeLastItemResultsRenders,
            removeLastItemFormatCalls,
            removeLastItemRowRenders,
        });

        expect(dialogToggleResultsRenders).toBe(0);
        expect(dialogToggleFormatCalls).toBe(0);
        expect(dateChangeFormatCalls).toBe(0);
        expect(dateChangeRowRenders).toBe(0);
        expect(removeLastItemResultsRenders).toBe(1);
        expect(removeLastItemRowRenders).toBe(0);
    }, 15000);

    it("measures GroceriesDashboardCategoriesSection selection latency and layout reads", async () => {
        const translations = createTestTranslations();
        const currencyFormatter = new Intl.NumberFormat("en", {
            style: "currency",
            currency: "USD",
        });
        const percentFormatter = new Intl.NumberFormat("en", {
            style: "percent",
            maximumFractionDigits: 0,
        });

        const categories = [
            makeCategorySummary({ category: "dairy", label: "Dairy" }),
            makeCategorySummary({
                category: "produce",
                label: "Produce",
                groups: [
                    {
                        normalizedItem: "apple",
                        item: "Apple",
                        quantity: 2,
                        unitPrice: 3.5,
                        total: 7,
                        entries: [makeEntry({ id: "e-2", category: "produce", item: "Apple", normalizedItem: "apple" })],
                    },
                ],
            }),
            makeCategorySummary({
                category: "bakery",
                label: "Bakery",
                groups: [
                    {
                        normalizedItem: "bread",
                        item: "Bread",
                        quantity: 1,
                        unitPrice: 4,
                        total: 4,
                        entries: [makeEntry({ id: "e-3", category: "bakery", item: "Bread", normalizedItem: "bread" })],
                    },
                ],
            }),
        ];

        const rectSpy = jest.spyOn(Element.prototype, "getBoundingClientRect");

        const { rerender } = renderWithProviders(
            <GroceriesDashboardCategoriesSection
                categories={categories}
                activeCategory="dairy"
                active={categories[0]}
                activeCategoryLabel="Dairy"
                isMobileDetailOpen={false}
                translations={translations}
                currencyFormatter={currencyFormatter}
                percentFormatter={percentFormatter}
                onSelectCategory={jest.fn()}
                onMobileDialogOpenChange={jest.fn()}
            />,
        );

        rectSpy.mockClear();
        const t0 = performance.now();
        rerender(
            <GroceriesDashboardCategoriesSection
                categories={categories}
                activeCategory="produce"
                active={categories[1]}
                activeCategoryLabel="Produce"
                isMobileDetailOpen={false}
                translations={translations}
                currencyFormatter={currencyFormatter}
                percentFormatter={percentFormatter}
                onSelectCategory={jest.fn()}
                onMobileDialogOpenChange={jest.fn()}
            />,
        );
        await screen.findByText("Apple");
        const switchLatencyMs = performance.now() - t0;
        const rectCalls = rectSpy.mock.calls.length;

        console.info("[PERF] CategoriesSection", {
            switchLatencyMs: Number(switchLatencyMs.toFixed(2)),
            rectCalls,
        });

        expect(rectCalls).toBe(0);
        expect(screen.getByText("Apple")).toBeInTheDocument();

        rectSpy.mockRestore();
    });

    it("measures GroceriesDashboardBoardsPanel header/select re-renders when typing in Create Board", async () => {
        const translations = createTestTranslations();
        const activeBoard = boardFixtures[0];

        selectRenderCount = 0;
        renderWithProviders(
            <GroceriesDashboardBoardsPanel
                activeBoard={activeBoard}
                boards={boardFixtures}
                members={[]}
                translations={translations}
                onBoardActivated={jest.fn()}
            />,
        );
        const initialSelectRenders = selectRenderCount;

        await userEvent.click(
            screen.getByRole("button", { name: "groceries.boards.createBoard" }),
        );
        selectRenderCount = 0;
        const input = screen.getByLabelText("groceries.boards.createBoardPlaceholder");
        await userEvent.type(input, "Weekly Groceries");
        const typingSelectRenders = selectRenderCount;

        console.info("[PERF] BoardsPanel", {
            initialSelectRenders,
            typingSelectRenders,
        });

        expect(initialSelectRenders).toBe(1);
        expect(typingSelectRenders).toBe(0);
    });
});
