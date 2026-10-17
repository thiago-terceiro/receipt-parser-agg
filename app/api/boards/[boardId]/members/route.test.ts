/**
 * @jest-environment node
 */

import { GET } from "@/app/api/boards/[boardId]/members/route";
import {
    BoardRouteError,
    listBoardMembersForIdentity,
    requireBoardIdentity,
} from "@/lib/boards-server";

jest.mock("@/lib/boards-server", () => {
    const actual = jest.requireActual("@/lib/boards-server");
    return {
        ...actual,
        listBoardMembersForIdentity: jest.fn(),
        requireBoardIdentity: jest.fn(),
    };
});

const mockRequireBoardIdentity = requireBoardIdentity as jest.MockedFunction<
    typeof requireBoardIdentity
>;
const mockListBoardMembersForIdentity =
    listBoardMembersForIdentity as jest.MockedFunction<
        typeof listBoardMembersForIdentity
    >;

const testIdentity = {
    userId: "user-123",
    email: "user@example.com",
    name: "Test User",
    image: null,
};

const sampleMembers = [
    {
        id: "membership-1",
        userId: "user-123",
        boardId: "board-123",
        role: "owner" as const,
        status: "active" as const,
        joinedAt: "2026-04-01T00:00:00.000Z",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
        email: "user@example.com",
        displayName: "Test User",
        imageUrl: null,
    },
    {
        id: "membership-2",
        userId: "user-456",
        boardId: "board-123",
        role: "editor" as const,
        status: "active" as const,
        joinedAt: "2026-04-02T00:00:00.000Z",
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
        email: "partner@example.com",
        displayName: "Partner User",
        imageUrl: null,
    },
];

describe("GET /api/boards/[boardId]/members", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireBoardIdentity.mockResolvedValue(testIdentity);
    });

    it("returns members for the board", async () => {
        mockListBoardMembersForIdentity.mockResolvedValueOnce(sampleMembers);

        const request = new Request("http://localhost/api/boards/board-123/members");
        const response = await GET(request, {
            params: Promise.resolve({ boardId: "board-123" }),
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            members: sampleMembers,
        });
        expect(mockListBoardMembersForIdentity).toHaveBeenCalledWith(
            testIdentity,
            "board-123",
        );
    });

    it("returns 401 when unauthenticated", async () => {
        mockRequireBoardIdentity.mockRejectedValueOnce(
            new BoardRouteError("You must be signed in to view board members.", 401),
        );

        const request = new Request("http://localhost/api/boards/board-123/members");
        const response = await GET(request, {
            params: Promise.resolve({ boardId: "board-123" }),
        });

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            error: "You must be signed in to view board members.",
        });
    });

    it("returns 404 when board does not exist or user lacks access", async () => {
        mockListBoardMembersForIdentity.mockRejectedValueOnce(
            new BoardRouteError("Board not found or access denied.", 404),
        );

        const request = new Request("http://localhost/api/boards/missing-board/members");
        const response = await GET(request, {
            params: Promise.resolve({ boardId: "missing-board" }),
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: "Board not found or access denied.",
        });
    });

    it("returns 500 on unexpected errors", async () => {
        mockListBoardMembersForIdentity.mockRejectedValueOnce(
            new Error("Supabase internal error"),
        );

        const request = new Request("http://localhost/api/boards/board-123/members");
        const response = await GET(request, {
            params: Promise.resolve({ boardId: "board-123" }),
        });

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            error: "Supabase internal error",
        });
    });
});
