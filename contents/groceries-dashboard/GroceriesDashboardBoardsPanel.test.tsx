import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GroceriesDashboardBoardsPanel } from "@/contents/groceries-dashboard/GroceriesDashboardBoardsPanel";
import { createTestTranslations } from "@/test/mock-state";

const createJsonResponse = (body: unknown, ok = true) =>
    ({
        json: jest.fn().mockResolvedValue(body),
        ok,
    }) as unknown as Response;

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

describe("GroceriesDashboardBoardsPanel", () => {
    const translations = createTestTranslations();

    it("notifies the parent after creating a board", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            createJsonResponse({
                board: {
                    id: "9c4f8769-3c63-4e21-9df7-99d1f2e4432a",
                    name: "Weekend groceries",
                },
            }),
        ) as jest.Mock;
        const onBoardActivated = jest.fn();

        render(
            <GroceriesDashboardBoardsPanel
                activeBoard={activeBoard}
                boards={[activeBoard]}
                members={members}
                translations={translations}
                onBoardActivated={onBoardActivated}
            />,
        );

        await userEvent.click(
            screen.getByRole("button", { name: "groceries.boards.createBoard" }),
        );
        await userEvent.type(
            screen.getByPlaceholderText("groceries.boards.createBoardPlaceholder"),
            "Weekend groceries",
        );
        await userEvent.click(
            screen.getByRole("button", { name: "groceries.boards.createBoardSubmit" }),
        );

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/boards",
                expect.objectContaining({
                    body: JSON.stringify({ name: "Weekend groceries" }),
                    method: "POST",
                }),
            );
        });
        expect(onBoardActivated).toHaveBeenCalledWith(
            "9c4f8769-3c63-4e21-9df7-99d1f2e4432a",
        );
    });
});