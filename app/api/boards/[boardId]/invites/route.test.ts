/**
 * @jest-environment node
 */

import { POST } from "@/app/api/boards/[boardId]/invites/route";
import {
    BoardRouteError,
    createBoardInviteForIdentity,
    requireBoardIdentity,
} from "@/lib/boards-server";

jest.mock("@/lib/boards-server", () => {
    const actual = jest.requireActual("@/lib/boards-server");
    return {
        ...actual,
        createBoardInviteForIdentity: jest.fn(),
        requireBoardIdentity: jest.fn(),
    };
});

const mockRequireBoardIdentity = requireBoardIdentity as jest.MockedFunction<
    typeof requireBoardIdentity
>;
const mockCreateBoardInviteForIdentity =
    createBoardInviteForIdentity as jest.MockedFunction<
        typeof createBoardInviteForIdentity
    >;

const testIdentity = {
    userId: "user-123",
    email: "user@example.com",
    name: "Test User",
    image: null,
};

const sampleInvite = {
    id: "invite-123",
    email: "invitee@example.com",
    expiresAt: "2026-05-01T00:00:00.000Z",
    inviteUrl: "http://localhost:3000/invite/secure-token-abc",
    role: "editor" as const,
    status: "pending",
    token: "secure-token-abc",
};

describe("POST /api/boards/[boardId]/invites", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireBoardIdentity.mockResolvedValue(testIdentity);
    });

    it("creates an invite and returns 201", async () => {
        mockCreateBoardInviteForIdentity.mockResolvedValueOnce(sampleInvite);

        const request = new Request("http://localhost/api/boards/board-456/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "invitee@example.com",
                role: "editor",
            }),
        });

        const response = await POST(request, {
            params: Promise.resolve({ boardId: "board-456" }),
        });

        expect(response.status).toBe(201);
        await expect(response.json()).resolves.toEqual({
            invite: sampleInvite,
        });
        expect(mockCreateBoardInviteForIdentity).toHaveBeenCalledWith(
            testIdentity,
            "board-456",
            "invitee@example.com",
            "editor",
        );
    });

    it("returns 401 when user is not authenticated", async () => {
        mockRequireBoardIdentity.mockRejectedValueOnce(
            new BoardRouteError("You must be signed in to manage board access.", 401),
        );

        const request = new Request("http://localhost/api/boards/board-456/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "test@example.com" }),
        });

        const response = await POST(request, {
            params: Promise.resolve({ boardId: "board-456" }),
        });

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            error: "You must be signed in to manage board access.",
        });
    });

    it("returns 403 when user is not authorized to invite members", async () => {
        mockCreateBoardInviteForIdentity.mockRejectedValueOnce(
            new BoardRouteError("You do not have permission to invite members.", 403),
        );

        const request = new Request("http://localhost/api/boards/board-456/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "test@example.com" }),
        });

        const response = await POST(request, {
            params: Promise.resolve({ boardId: "board-456" }),
        });

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: "You do not have permission to invite members.",
        });
    });

    it("returns 400 when invite parameters are invalid", async () => {
        mockCreateBoardInviteForIdentity.mockRejectedValueOnce(
            new BoardRouteError("Invalid email format.", 400),
        );

        const request = new Request("http://localhost/api/boards/board-456/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "not-an-email" }),
        });

        const response = await POST(request, {
            params: Promise.resolve({ boardId: "board-456" }),
        });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "Invalid email format.",
        });
    });

    it("returns 500 when an unexpected internal error occurs", async () => {
        mockCreateBoardInviteForIdentity.mockRejectedValueOnce(
            new Error("Database connection lost"),
        );

        const request = new Request("http://localhost/api/boards/board-456/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "test@example.com" }),
        });

        const response = await POST(request, {
            params: Promise.resolve({ boardId: "board-456" }),
        });

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            error: "Database connection lost",
        });
    });

    it("returns 400 when body is not valid JSON", async () => {
        const request = new Request("http://localhost/api/boards/board-456/invites", {
            method: "POST",
            body: "invalid-json",
        });

        const response = await POST(request, {
            params: Promise.resolve({ boardId: "board-456" }),
        });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "Invalid JSON request body.",
        });
    });

    it("returns 400 when body is JSON null or not an object", async () => {
        const request = new Request("http://localhost/api/boards/board-456/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "null",
        });

        const response = await POST(request, {
            params: Promise.resolve({ boardId: "board-456" }),
        });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "Invalid JSON request body.",
        });
    });
});
