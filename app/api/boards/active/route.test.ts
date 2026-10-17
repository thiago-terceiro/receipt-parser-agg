/**
 * @jest-environment node
 */

import { POST } from "@/app/api/boards/active/route";
import {
    BoardRouteError,
    requireBoardIdentity,
    setLastActiveBoardForIdentity,
} from "@/lib/boards-server";

jest.mock("@/lib/boards-server", () => {
    const actual = jest.requireActual("@/lib/boards-server");
    return {
        ...actual,
        requireBoardIdentity: jest.fn(),
        setLastActiveBoardForIdentity: jest.fn(),
    };
});

const mockRequireBoardIdentity = requireBoardIdentity as jest.MockedFunction<
    typeof requireBoardIdentity
>;
const mockSetLastActiveBoardForIdentity =
    setLastActiveBoardForIdentity as jest.MockedFunction<
        typeof setLastActiveBoardForIdentity
    >;

const testIdentity = {
    userId: "user-123",
    email: "user@example.com",
    name: "Test User",
    image: null,
};

const sampleBoard = {
    id: "board-789",
    name: "Groceries Board",
    owner_user_id: "user-123",
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    archived_at: null,
};

describe("POST /api/boards/active", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireBoardIdentity.mockResolvedValue(testIdentity);
    });

    it("sets the active board for the authenticated user", async () => {
        mockSetLastActiveBoardForIdentity.mockResolvedValueOnce(sampleBoard);

        const request = new Request("http://localhost/api/boards/active", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boardId: "board-789" }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            board: sampleBoard,
        });
        expect(mockSetLastActiveBoardForIdentity).toHaveBeenCalledWith(
            testIdentity,
            "board-789",
        );
    });

    it("returns 401 when unauthenticated", async () => {
        mockRequireBoardIdentity.mockRejectedValueOnce(
            new BoardRouteError("You must be signed in to select an active board.", 401),
        );

        const request = new Request("http://localhost/api/boards/active", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boardId: "board-789" }),
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            error: "You must be signed in to select an active board.",
        });
    });

    it("returns 404 when target board is not accessible", async () => {
        mockSetLastActiveBoardForIdentity.mockRejectedValueOnce(
            new BoardRouteError("Selected board was not found.", 404),
        );

        const request = new Request("http://localhost/api/boards/active", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boardId: "nonexistent-board" }),
        });

        const response = await POST(request);
        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: "Selected board was not found.",
        });
    });

    it("returns 500 when updating active board fails unexpectedly", async () => {
        mockSetLastActiveBoardForIdentity.mockRejectedValueOnce(
            new Error("Profile update error"),
        );

        const request = new Request("http://localhost/api/boards/active", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boardId: "board-789" }),
        });

        const response = await POST(request);
        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            error: "Profile update error",
        });
    });

    it("returns 400 when body is not valid JSON", async () => {
        const request = new Request("http://localhost/api/boards/active", {
            method: "POST",
            body: "invalid-json",
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "Invalid JSON request body.",
        });
    });

    it("returns 400 when body is JSON null or not an object", async () => {
        const request = new Request("http://localhost/api/boards/active", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "null",
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "Invalid JSON request body.",
        });
    });
});
