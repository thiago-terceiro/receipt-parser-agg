/**
 * @jest-environment node
 */

import { POST } from "@/app/api/invites/accept/route";
import {
    acceptBoardInviteForIdentity,
    BoardRouteError,
    requireBoardIdentity,
} from "@/lib/boards-server";

jest.mock("@/lib/boards-server", () => {
    const actual = jest.requireActual("@/lib/boards-server");
    return {
        ...actual,
        acceptBoardInviteForIdentity: jest.fn(),
        requireBoardIdentity: jest.fn(),
    };
});

const mockRequireBoardIdentity = requireBoardIdentity as jest.MockedFunction<
    typeof requireBoardIdentity
>;
const mockAcceptBoardInviteForIdentity =
    acceptBoardInviteForIdentity as jest.MockedFunction<
        typeof acceptBoardInviteForIdentity
    >;

const testIdentity = {
    userId: "user-123",
    email: "person@example.com",
    name: "Test User",
    image: null,
};

describe("POST /api/invites/accept", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireBoardIdentity.mockResolvedValue(testIdentity);
    });

    it("returns 401 if user is not authenticated", async () => {
        mockRequireBoardIdentity.mockRejectedValueOnce(
            new BoardRouteError("Please sign in to access boards.", 401),
        );

        const request = new Request("https://example.com/api/invites/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: "test-token" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Please sign in to access boards.");
    });

    it("returns 400 when invite token is missing", async () => {
        mockAcceptBoardInviteForIdentity.mockRejectedValueOnce(
            new BoardRouteError("Invite token is required.", 400),
        );

        const request = new Request("https://example.com/api/invites/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Invite token is required.");
    });

    it("returns 404 when invite token is invalid", async () => {
        mockAcceptBoardInviteForIdentity.mockRejectedValueOnce(
            new BoardRouteError("Invite token is invalid or expired.", 404),
        );

        const request = new Request("https://example.com/api/invites/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: "invalid-token" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("Invite token is invalid or expired.");
    });

    it("returns 410 when invite token has expired", async () => {
        mockAcceptBoardInviteForIdentity.mockRejectedValueOnce(
            new BoardRouteError("This invitation link has expired.", 410),
        );

        const request = new Request("https://example.com/api/invites/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: "expired-token" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(410);
        expect(data.error).toBe("This invitation link has expired.");
    });

    it("returns 409 when invite was already accepted by someone else", async () => {
        mockAcceptBoardInviteForIdentity.mockRejectedValueOnce(
            new BoardRouteError("This invitation has already been accepted.", 409),
        );

        const request = new Request("https://example.com/api/invites/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: "claimed-token" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toBe("This invitation has already been accepted.");
    });

    it("returns 403 when email does not match invite", async () => {
        mockAcceptBoardInviteForIdentity.mockRejectedValueOnce(
            new BoardRouteError(
                "The signed-in email does not match this invite.",
                403,
            ),
        );

        const request = new Request("https://example.com/api/invites/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: "wrong-email-token" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe("The signed-in email does not match this invite.");
    });

    it("successfully accepts invite and returns invite data", async () => {
        mockAcceptBoardInviteForIdentity.mockResolvedValueOnce({
            board_id: "board-456",
            board_name: "Collaborative Groceries",
            role: "editor",
        });

        const request = new Request("https://example.com/api/invites/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: "valid-token" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.invite).toEqual({
            board_id: "board-456",
            board_name: "Collaborative Groceries",
            role: "editor",
        });
        expect(mockAcceptBoardInviteForIdentity).toHaveBeenCalledWith(
            testIdentity,
            "valid-token",
        );
    });

    it("handles unexpected runtime errors gracefully with 500 status", async () => {
        mockAcceptBoardInviteForIdentity.mockRejectedValueOnce(
            new Error("Database connection lost"),
        );

        const request = new Request("https://example.com/api/invites/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: "valid-token" }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Database connection lost");
    });
});
