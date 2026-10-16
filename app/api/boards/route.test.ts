/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/boards/route";
import {
    BoardRouteError,
    createBoardForIdentity,
    listBoardsForIdentity,
    requireBoardIdentity,
} from "@/lib/boards-server";

jest.mock("@/lib/boards-server", () => {
    const actual = jest.requireActual("@/lib/boards-server");
    return {
        ...actual,
        createBoardForIdentity: jest.fn(),
        listBoardsForIdentity: jest.fn(),
        requireBoardIdentity: jest.fn(),
    };
});

const mockRequireBoardIdentity = requireBoardIdentity as jest.MockedFunction<
    typeof requireBoardIdentity
>;
const mockListBoardsForIdentity = listBoardsForIdentity as jest.MockedFunction<
    typeof listBoardsForIdentity
>;
const mockCreateBoardForIdentity =
    createBoardForIdentity as jest.MockedFunction<
        typeof createBoardForIdentity
    >;

const testIdentity = {
    userId: "user-123",
    email: "user@example.com",
    name: "Test User",
    image: null,
};

const sampleBoard = {
    id: "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d",
    name: "Household Board",
    ownerUserId: "user-123",
    role: "owner" as const,
    joinedAt: "2026-04-01T00:00:00.000Z",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    archivedAt: null,
};

describe("app/api/boards/route", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireBoardIdentity.mockResolvedValue(testIdentity);
    });

    describe("GET /api/boards", () => {
        it("returns boards for the authenticated user", async () => {
            mockListBoardsForIdentity.mockResolvedValueOnce([sampleBoard]);

            const response = await GET();
            expect(response.status).toBe(200);
            await expect(response.json()).resolves.toEqual({
                boards: [sampleBoard],
            });
            expect(mockListBoardsForIdentity).toHaveBeenCalledWith(testIdentity);
        });

        it("returns 401 when user is not authenticated", async () => {
            mockRequireBoardIdentity.mockRejectedValueOnce(
                new BoardRouteError("Authentication is required.", 401),
            );

            const response = await GET();
            expect(response.status).toBe(401);
            await expect(response.json()).resolves.toEqual({
                error: "Authentication is required.",
            });
        });
    });

    describe("POST /api/boards", () => {
        it("creates a new board and returns 201", async () => {
            const createdBoardRecord = {
                id: sampleBoard.id,
                name: sampleBoard.name,
                owner_user_id: sampleBoard.ownerUserId,
                created_at: sampleBoard.createdAt,
                updated_at: sampleBoard.updatedAt,
                archived_at: null,
            };
            mockCreateBoardForIdentity.mockResolvedValueOnce(createdBoardRecord);

            const request = new Request("http://localhost/api/boards", {
                method: "POST",
                body: JSON.stringify({ name: "Household Board" }),
            });

            const response = await POST(request);
            expect(response.status).toBe(201);
            await expect(response.json()).resolves.toEqual({
                board: createdBoardRecord,
            });
            expect(mockCreateBoardForIdentity).toHaveBeenCalledWith(
                testIdentity,
                "Household Board",
            );
        });

        it("returns 400 when board name validation fails", async () => {
            mockCreateBoardForIdentity.mockRejectedValueOnce(
                new BoardRouteError("Board name is required.", 400),
            );

            const request = new Request("http://localhost/api/boards", {
                method: "POST",
                body: JSON.stringify({ name: "   " }),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
            await expect(response.json()).resolves.toEqual({
                error: "Board name is required.",
            });
        });
    });
});
