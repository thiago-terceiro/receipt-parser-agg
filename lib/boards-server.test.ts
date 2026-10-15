jest.mock("@/lib/observability", () => ({
    withSpan: async (_name: string, run: (span: { setAttributes: jest.Mock }) => Promise<unknown>) => {
        return run({ setAttributes: jest.fn() });
    },
}));

jest.mock("@/lib/session", () => ({
    getSessionIdentity: jest.fn(),
}));

jest.mock("@/lib/supabase-server", () => ({
    getSupabaseServerClient: jest.fn(),
    hasSupabaseServerConfig: true,
}));

import {
    acceptBoardInviteForIdentity,
    BoardRouteError,
    getPendingBoardInviteDetails,
} from "@/lib/boards-server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const mockGetSupabaseServerClient = getSupabaseServerClient as jest.Mock;

const createMockClient = ({
    board,
    existingJoinedAt = null,
    invite,
}: {
    board?: { id: string; name: string } | null;
    existingJoinedAt?: string | null;
    invite?: {
        id: string;
        board_id: string;
        email: string | null;
        invited_by_user_id: string;
        role: "editor";
    } | null;
}) => {
    const profileSingle = jest.fn().mockResolvedValue({
        data: {
            display_name: "Invitee",
            email: "person@example.com",
            id: "user-123",
            image_url: null,
            last_active_board_id: null,
        },
        error: null,
    });
    const profileSelect = jest.fn(() => ({ single: profileSingle }));
    const profileUpsert = jest.fn(() => ({ select: profileSelect }));
    const profileUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const profileUpdate = jest.fn(() => ({ eq: profileUpdateEq }));

    const inviteMaybeSingle = jest.fn().mockResolvedValue({ data: invite ?? null, error: null });
    const inviteGt = jest.fn(() => ({ maybeSingle: inviteMaybeSingle }));
    const inviteEqStatus = jest.fn(() => ({ gt: inviteGt }));
    const inviteEqToken = jest.fn(() => ({ eq: inviteEqStatus }));
    const inviteSelect = jest.fn(() => ({ eq: inviteEqToken }));
    const inviteUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const inviteUpdate = jest.fn(() => ({ eq: inviteUpdateEq }));

    const memberMaybeSingle = jest.fn().mockResolvedValue({
        data: existingJoinedAt ? { joined_at: existingJoinedAt } : null,
        error: null,
    });
    const memberEqUser = jest.fn(() => ({ maybeSingle: memberMaybeSingle }));
    const memberEqBoard = jest.fn(() => ({ eq: memberEqUser }));
    const memberSelect = jest.fn(() => ({ eq: memberEqBoard }));
    const memberUpsert = jest.fn().mockResolvedValue({ error: null });

    const boardMaybeSingle = jest.fn().mockResolvedValue({ data: board ?? null, error: null });
    const boardEq = jest.fn(() => ({ maybeSingle: boardMaybeSingle }));
    const boardSelect = jest.fn(() => ({ eq: boardEq }));

    const client = {
        from: jest.fn((table: string) => {
            switch (table) {
                case "profiles":
                    return {
                        update: profileUpdate,
                        upsert: profileUpsert,
                    };
                case "board_invites":
                    return {
                        select: inviteSelect,
                        update: inviteUpdate,
                    };
                case "board_members":
                    return {
                        select: memberSelect,
                        upsert: memberUpsert,
                    };
                case "boards":
                    return {
                        select: boardSelect,
                    };
                default:
                    throw new Error(`Unexpected table: ${table}`);
            }
        }),
    };

    return {
        client,
        mocks: {
            inviteUpdate,
            inviteUpdateEq,
            memberUpsert,
            profileUpdate,
            profileUpdateEq,
        },
    };
};

describe("acceptBoardInviteForIdentity", () => {
    beforeEach(() => {
        mockGetSupabaseServerClient.mockReset();
    });

    it("accepts a pending invite without using the RPC", async () => {
        const { client, mocks } = createMockClient({
            board: { id: "board-123", name: "Shared board" },
            invite: {
                id: "invite-123",
                board_id: "board-123",
                email: "person@example.com",
                invited_by_user_id: "owner-123",
                role: "editor",
            },
        });

        mockGetSupabaseServerClient.mockReturnValue(client);

        await expect(
            acceptBoardInviteForIdentity({
                email: "person@example.com",
                image: null,
                name: "Person",
                userId: "user-123",
            }, "invite-token"),
        ).resolves.toEqual({
            board_id: "board-123",
            board_name: "Shared board",
            role: "editor",
        });

        expect(mocks.memberUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                board_id: "board-123",
                invited_by_user_id: "owner-123",
                role: "editor",
                status: "active",
                user_id: "user-123",
            }),
            expect.objectContaining({ onConflict: "board_id,user_id" }),
        );
        expect(mocks.inviteUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                accepted_by_user_id: "user-123",
                status: "accepted",
            }),
        );
        expect(mocks.profileUpdate).toHaveBeenCalledWith({
            last_active_board_id: "board-123",
        });
        expect(mocks.inviteUpdateEq).toHaveBeenCalledWith("id", "invite-123");
        expect(mocks.profileUpdateEq).toHaveBeenCalledWith("id", "user-123");
    });

    it("rejects invite email mismatches before mutating membership state", async () => {
        const { client, mocks } = createMockClient({
            board: { id: "board-123", name: "Shared board" },
            invite: {
                id: "invite-123",
                board_id: "board-123",
                email: "other@example.com",
                invited_by_user_id: "owner-123",
                role: "editor",
            },
        });

        mockGetSupabaseServerClient.mockReturnValue(client);

        await expect(
            acceptBoardInviteForIdentity({
                email: "person@example.com",
                image: null,
                name: "Person",
                userId: "user-123",
            }, "invite-token"),
        ).rejects.toMatchObject({
            message: "The signed-in email does not match this invite.",
            statusCode: 403,
        } satisfies Partial<BoardRouteError>);

        expect(mocks.memberUpsert).not.toHaveBeenCalled();
        expect(mocks.inviteUpdate).not.toHaveBeenCalled();
        expect(mocks.profileUpdate).not.toHaveBeenCalled();
    });

    describe("getPendingBoardInviteDetails", () => {
        it("returns invite and board details when pending invite exists", async () => {
            const { client } = createMockClient({
                board: { id: "board-123", name: "Family Groceries" },
                invite: {
                    id: "invite-123",
                    board_id: "board-123",
                    email: "person@example.com",
                    invited_by_user_id: "owner-123",
                    role: "editor",
                },
            });

            mockGetSupabaseServerClient.mockReturnValue(client);

            const details = await getPendingBoardInviteDetails("valid-token");
            expect(details).toEqual({
                boardId: "board-123",
                boardName: "Family Groceries",
                role: "editor",
                email: "person@example.com",
            });
        });

        it("returns null when invite is not found or expired", async () => {
            const { client } = createMockClient({
                invite: null,
            });

            mockGetSupabaseServerClient.mockReturnValue(client);

            const details = await getPendingBoardInviteDetails("non-existent-token");
            expect(details).toBeNull();
        });

        it("returns null when token is invalid or empty", async () => {
            expect(await getPendingBoardInviteDetails("")).toBeNull();
            expect(await getPendingBoardInviteDetails("   ")).toBeNull();
            expect(await getPendingBoardInviteDetails(null)).toBeNull();
            expect(await getPendingBoardInviteDetails(undefined)).toBeNull();
        });
    });
});