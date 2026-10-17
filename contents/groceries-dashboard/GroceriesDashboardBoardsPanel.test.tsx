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
        expect(
            screen.getByLabelText("groceries.boards.createBoardPlaceholder"),
        ).toBeInTheDocument();
        await userEvent.type(
            screen.getByLabelText("groceries.boards.createBoardPlaceholder"),
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

    it("renders board switcher with accessible name and creates invite with accessible fields", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            createJsonResponse({
                invite: {
                    inviteUrl: "/en/invite?token=secret-token",
                },
            }),
        ) as jest.Mock;

        render(
            <GroceriesDashboardBoardsPanel
                activeBoard={activeBoard}
                boards={[activeBoard]}
                members={members}
                translations={translations}
                onBoardActivated={jest.fn()}
            />,
        );

        // Verify board select trigger accessibility
        const selectTrigger = screen.getByRole("combobox", {
            name: "groceries.boards.selectBoard",
        });
        expect(selectTrigger).toBeInTheDocument();

        // Open invite modal
        await userEvent.click(screen.getByRole("button", { name: "groceries.boards.invite" }));
        expect(
            screen.getByLabelText("groceries.boards.inviteEmailLabel"),
        ).toBeInTheDocument();

        // Submit invite creation
        await userEvent.click(
            screen.getByRole("button", { name: "groceries.boards.createInvite" }),
        );

        await waitFor(() => {
            expect(screen.getByLabelText("groceries.boards.inviteLinkLabel")).toBeInTheDocument();
        });

        expect(screen.getByLabelText("groceries.boards.inviteLinkLabel")).toHaveValue(
            `${window.location.origin}/en/invite?token=secret-token`,
        );
    });

    it("renders errors inside the create board dialog when creation fails", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            createJsonResponse({ error: "Board name is too long." }, false),
        ) as jest.Mock;

        render(
            <GroceriesDashboardBoardsPanel
                activeBoard={activeBoard}
                boards={[activeBoard]}
                members={members}
                translations={translations}
                onBoardActivated={jest.fn()}
            />,
        );

        await userEvent.click(
            screen.getByRole("button", { name: "groceries.boards.createBoard" }),
        );
        await userEvent.type(
            screen.getByLabelText("groceries.boards.createBoardPlaceholder"),
            "Invalid board",
        );
        await userEvent.click(
            screen.getByRole("button", { name: "groceries.boards.createBoardSubmit" }),
        );

        await waitFor(() => {
            expect(screen.getAllByText("Board name is too long.").length).toBeGreaterThan(0);
        });
    });
});