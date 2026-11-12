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
    listBoardMembersForIdentity,
    listBoardsForIdentity,
    requireBoardAccess,
    resolveActiveBoardForIdentity,
} from "@/lib/boards-server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const mockGetSupabaseServerClient = getSupabaseServerClient as jest.Mock;

const createMockClient = ({
    board,
    existingJoinedAt = null,
    existingMembership = null,
    invite,
    existingInvite,
    updatedInviteRows,
}: {
    board?: { id: string; name: string } | null;
    existingJoinedAt?: string | null;
    existingMembership?: { role: "owner" | "editor"; status: "active" | "removed"; joined_at?: string } | null;
    invite?: {
        id: string;
        board_id: string;
        email: string | null;
        invited_by_user_id: string;
        role: "editor";
    } | null;
    existingInvite?: {
        id: string;
        board_id: string;
        email: string | null;
        role: "editor";
        status: string;
        expires_at: string;
    } | null;
    updatedInviteRows?: Array<{ id: string }> | null;
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
    const resolvedExistingInvite = existingInvite !== undefined
        ? existingInvite
        : invite
            ? {
                ...invite,
                status: "pending",
                expires_at: new Date(Date.now() + 86_400_000).toISOString(),
            }
            : null;
    const fallbackMaybeSingle = jest.fn().mockResolvedValue({ data: resolvedExistingInvite, error: null });
    const inviteGt = jest.fn(() => ({ maybeSingle: inviteMaybeSingle }));
    const inviteEqStatus = jest.fn(() => ({ gt: inviteGt, maybeSingle: inviteMaybeSingle }));
    const inviteEqToken = jest.fn(() => ({ eq: inviteEqStatus, maybeSingle: fallbackMaybeSingle }));
    const inviteSelect = jest.fn(() => ({ eq: inviteEqToken }));
    const inviteUpdateSelect = jest.fn().mockResolvedValue({
        data: updatedInviteRows !== undefined ? updatedInviteRows : [{ id: invite?.id ?? "invite-123" }],
        error: null,
    });
    const inviteUpdateEq: jest.Mock = jest.fn();
    inviteUpdateEq.mockImplementation(() => ({
        eq: inviteUpdateEq,
        select: inviteUpdateSelect,
    }));
    const inviteUpdate = jest.fn(() => ({ eq: inviteUpdateEq }));

    const memberMaybeSingle = jest.fn().mockResolvedValue({
        data: existingMembership ?? (existingJoinedAt ? { joined_at: existingJoinedAt } : null),
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
            inviteUpdateSelect,
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
        expect(mocks.inviteUpdateEq).toHaveBeenCalledWith("status", "pending");
        expect(mocks.inviteUpdateSelect).toHaveBeenCalledWith("id");
        expect(mocks.profileUpdateEq).toHaveBeenCalledWith("id", "user-123");
    });

    it("rejects with 409 when atomic invite claim updates 0 rows due to race condition", async () => {
        const { client, mocks } = createMockClient({
            board: { id: "board-123", name: "Shared board" },
            invite: {
                id: "invite-123",
                board_id: "board-123",
                email: "person@example.com",
                invited_by_user_id: "owner-123",
                role: "editor",
            },
            updatedInviteRows: [],
        });

        mockGetSupabaseServerClient.mockReturnValue(client);

        await expect(
            acceptBoardInviteForIdentity({
                email: "person@example.com",
                image: null,
                name: "Person",
                userId: "user-123",
            }, "invite-token"),
        ).rejects.toThrow(new BoardRouteError("This invitation has already been accepted.", 409));

        expect(mocks.memberUpsert).not.toHaveBeenCalled();
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

    it("preserves owner role and does not burn invite when user is already an active member", async () => {
        const { client, mocks } = createMockClient({
            board: { id: "board-123", name: "Shared board" },
            invite: {
                id: "invite-123",
                board_id: "board-123",
                email: "owner@example.com",
                invited_by_user_id: "owner-123",
                role: "editor",
            },
            existingMembership: {
                role: "owner",
                status: "active",
            },
        });

        mockGetSupabaseServerClient.mockReturnValue(client);

        await expect(
            acceptBoardInviteForIdentity({
                email: "owner@example.com",
                image: null,
                name: "Owner User",
                userId: "owner-123",
            }, "invite-token"),
        ).resolves.toEqual({
            board_id: "board-123",
            board_name: "Shared board",
            role: "owner",
        });

        expect(mocks.inviteUpdate).not.toHaveBeenCalled();
        expect(mocks.memberUpsert).not.toHaveBeenCalled();
        expect(mocks.profileUpdate).toHaveBeenCalledWith({
            last_active_board_id: "board-123",
        });
    });

    it("preserves active member role even if invite is email-restricted to another user", async () => {
        const { client, mocks } = createMockClient({
            board: { id: "board-123", name: "Shared board" },
            invite: {
                id: "invite-123",
                board_id: "board-123",
                email: "collaborator@example.com",
                invited_by_user_id: "owner-123",
                role: "editor",
            },
            existingMembership: {
                role: "owner",
                status: "active",
            },
        });

        mockGetSupabaseServerClient.mockReturnValue(client);

        await expect(
            acceptBoardInviteForIdentity({
                email: "owner@example.com",
                image: null,
                name: "Owner User",
                userId: "owner-123",
            }, "invite-token"),
        ).resolves.toEqual({
            board_id: "board-123",
            board_name: "Shared board",
            role: "owner",
        });

        expect(mocks.inviteUpdate).not.toHaveBeenCalled();
        expect(mocks.memberUpsert).not.toHaveBeenCalled();
        expect(mocks.profileUpdate).toHaveBeenCalledWith({
            last_active_board_id: "board-123",
        });
    });

    it("proceeds with invite acceptance when user is a removed member", async () => {
        const { client, mocks } = createMockClient({
            board: { id: "board-123", name: "Shared board" },
            invite: {
                id: "invite-123",
                board_id: "board-123",
                email: "person@example.com",
                invited_by_user_id: "owner-123",
                role: "editor",
            },
            existingMembership: {
                role: "editor",
                status: "removed",
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

        expect(mocks.inviteUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                accepted_by_user_id: "user-123",
                status: "accepted",
            }),
        );
        expect(mocks.memberUpsert).toHaveBeenCalled();
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
                status: "pending",
                isExpired: false,
                isAccepted: false,
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

        it("returns isAccepted: true and isExpired: false when accepted invite passes its expiry date", async () => {
            const { client } = createMockClient({
                board: { id: "board-123", name: "Family Groceries" },
                invite: null,
                existingInvite: {
                    id: "invite-accepted-id",
                    board_id: "board-123",
                    email: "person@example.com",
                    role: "editor",
                    status: "accepted",
                    expires_at: new Date(Date.now() - 100000).toISOString(),
                },
            });

            mockGetSupabaseServerClient.mockReturnValue(client);

            const details = await getPendingBoardInviteDetails("accepted-token");
            expect(details).toEqual({
                boardId: "board-123",
                boardName: "Family Groceries",
                role: "editor",
                email: "person@example.com",
                status: "accepted",
                isExpired: false,
                isAccepted: true,
            });
        });

        it("returns null when token is invalid or empty", async () => {
            expect(await getPendingBoardInviteDetails("")).toBeNull();
            expect(await getPendingBoardInviteDetails("   ")).toBeNull();
            expect(await getPendingBoardInviteDetails(null)).toBeNull();
            expect(await getPendingBoardInviteDetails(undefined)).toBeNull();
        });
    });

    describe("listBoardsForIdentity", () => {
        it("ensures a default board is created and returned if user has no boards", async () => {
            let membershipCallCount = 0;
            const mockClient = {
                from: jest.fn().mockImplementation((table: string) => {
                    if (table === "profiles") {
                        return {
                            upsert: jest.fn().mockReturnValue({
                                select: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: { id: "user-1", email: "user@example.com", last_active_board_id: null },
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "board_members") {
                        return {
                            select: jest.fn().mockReturnValue({
                                eq: jest.fn().mockReturnValue({
                                    eq: jest.fn().mockImplementation(() => {
                                        membershipCallCount++;
                                        if (membershipCallCount === 1) {
                                            return Promise.resolve({ data: [], error: null });
                                        }
                                        return Promise.resolve({
                                            data: [
                                                {
                                                    id: "member-1",
                                                    board_id: "board-default-id",
                                                    user_id: "user-1",
                                                    role: "owner",
                                                    status: "active",
                                                    joined_at: "2026-04-01T00:00:00.000Z",
                                                    created_at: "2026-04-01T00:00:00.000Z",
                                                    updated_at: "2026-04-01T00:00:00.000Z",
                                                },
                                            ],
                                            error: null,
                                        });
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "boards") {
                        return {
                            select: jest.fn().mockReturnValue({
                                in: jest.fn().mockReturnValue({
                                    is: jest.fn().mockResolvedValue({
                                        data: [
                                            {
                                                id: "board-default-id",
                                                name: "My groceries",
                                                owner_user_id: "user-1",
                                                created_at: "2026-04-01T00:00:00.000Z",
                                                updated_at: "2026-04-01T00:00:00.000Z",
                                                archived_at: null,
                                            },
                                        ],
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                }),
                rpc: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: {
                            board_id: "board-default-id",
                            board_name: "My groceries",
                            owner_user_id: "user-1",
                            role: "owner",
                            created_at: "2026-04-01T00:00:00.000Z",
                            updated_at: "2026-04-01T00:00:00.000Z",
                        },
                        error: null,
                    }),
                }),
            };

            mockGetSupabaseServerClient.mockReturnValue(mockClient);

            const boards = await listBoardsForIdentity({
                userId: "user-1",
                email: "user@example.com",
                name: "Test User",
                image: null,
            });

            expect(mockClient.rpc).toHaveBeenCalledWith("create_board_for_user", {
                p_name: "My groceries",
                p_user_id: "user-1",
            });
            expect(boards).toHaveLength(1);
            expect(boards[0].id).toBe("board-default-id");
            expect(boards[0].name).toBe("My groceries");
        });
    });

    describe("round-trip & concurrency optimizations", () => {
        const boardUuid = "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d";
        const identity = {
            userId: "user-1",
            email: "user@example.com",
            name: "Test User",
            image: null,
        };

        it("getPendingBoardInviteDetails queries board_invites only once even for missing/expired invites", async () => {
            const { client } = createMockClient({ invite: null, existingInvite: null });
            mockGetSupabaseServerClient.mockReturnValue(client);

            const details = await getPendingBoardInviteDetails("missing-token");
            expect(details).toBeNull();
            expect(client.from).toHaveBeenCalledTimes(1);
            expect(client.from).toHaveBeenCalledWith("board_invites");
        });

        it("resolveActiveBoardForIdentity runs profile+memberships in parallel and updates active board via direct RPC without re-checking access", async () => {
            const activeQueries: string[] = [];
            let maxConcurrent = 0;

            const trackQuery = <T,>(label: string, result: T) => {
                activeQueries.push(label);
                maxConcurrent = Math.max(maxConcurrent, activeQueries.length);
                return new Promise<T>((resolve) => {
                    setTimeout(() => {
                        const idx = activeQueries.indexOf(label);
                        if (idx >= 0) activeQueries.splice(idx, 1);
                        resolve(result);
                    }, 0);
                });
            };

            const mockClient = {
                from: jest.fn((table: string) => {
                    if (table === "profiles") {
                        return {
                            upsert: jest.fn(() => ({
                                select: jest.fn(() => ({
                                    single: () =>
                                        trackQuery("profiles.upsert", {
                                            data: {
                                                id: identity.userId,
                                                email: identity.email,
                                                display_name: identity.name,
                                                image_url: null,
                                                last_active_board_id: null,
                                            },
                                            error: null,
                                        }),
                                })),
                            })),
                        };
                    }
                    if (table === "board_members") {
                        return {
                            select: jest.fn(() => ({
                                eq: jest.fn(() => ({
                                    eq: jest.fn(() =>
                                        trackQuery("board_members.select", {
                                            data: [
                                                {
                                                    id: "member-1",
                                                    board_id: boardUuid,
                                                    user_id: identity.userId,
                                                    role: "owner",
                                                    status: "active",
                                                    joined_at: "2026-04-01T00:00:00.000Z",
                                                    created_at: "2026-04-01T00:00:00.000Z",
                                                    updated_at: "2026-04-01T00:00:00.000Z",
                                                },
                                            ],
                                            error: null,
                                        }),
                                    ),
                                })),
                            })),
                        };
                    }
                    if (table === "boards") {
                        return {
                            select: jest.fn(() => ({
                                in: jest.fn(() => ({
                                    is: jest.fn(() =>
                                        trackQuery("boards.select", {
                                            data: [
                                                {
                                                    id: boardUuid,
                                                    name: "Main Board",
                                                    owner_user_id: identity.userId,
                                                    created_at: "2026-04-01T00:00:00.000Z",
                                                    updated_at: "2026-04-01T00:00:00.000Z",
                                                    archived_at: null,
                                                },
                                            ],
                                            error: null,
                                        }),
                                    ),
                                })),
                            })),
                        };
                    }
                    throw new Error(`Unexpected table: ${table}`);
                }),
                rpc: jest.fn().mockResolvedValue({ error: null }),
            };

            mockGetSupabaseServerClient.mockReturnValue(mockClient);

            const selection = await resolveActiveBoardForIdentity(identity, boardUuid);
            expect(selection.activeBoard.id).toBe(boardUuid);
            // profiles.upsert + board_members.select ran concurrently (maxConcurrent >= 2)
            expect(maxConcurrent).toBeGreaterThanOrEqual(2);
            // Total table calls = 3 (profiles, board_members, boards) + 1 rpc (no extra requireBoardAccess!)
            expect(mockClient.from).toHaveBeenCalledTimes(3);
            expect(mockClient.rpc).toHaveBeenCalledTimes(1);
            expect(mockClient.rpc).toHaveBeenCalledWith("set_last_active_board", {
                p_board_id: boardUuid,
                p_user_id: identity.userId,
            });
        });

        it("requireBoardAccess runs profile, membership, and board queries in a single parallel batch", async () => {
            const activeQueries: string[] = [];
            let maxConcurrent = 0;

            const trackQuery = <T,>(label: string, result: T) => {
                activeQueries.push(label);
                maxConcurrent = Math.max(maxConcurrent, activeQueries.length);
                return new Promise<T>((resolve) => {
                    setTimeout(() => {
                        const idx = activeQueries.indexOf(label);
                        if (idx >= 0) activeQueries.splice(idx, 1);
                        resolve(result);
                    }, 0);
                });
            };

            const mockClient = {
                from: jest.fn((table: string) => {
                    if (table === "profiles") {
                        return {
                            upsert: jest.fn(() => ({
                                select: jest.fn(() => ({
                                    single: () =>
                                        trackQuery("profiles.upsert", {
                                            data: {
                                                id: identity.userId,
                                                email: identity.email,
                                                display_name: identity.name,
                                                image_url: null,
                                                last_active_board_id: boardUuid,
                                            },
                                            error: null,
                                        }),
                                })),
                            })),
                        };
                    }
                    if (table === "board_members") {
                        return {
                            select: jest.fn(() => ({
                                eq: jest.fn(() => ({
                                    eq: jest.fn(() => ({
                                        eq: jest.fn(() => ({
                                            maybeSingle: () =>
                                                trackQuery("board_members.select", {
                                                    data: {
                                                        id: "member-1",
                                                        board_id: boardUuid,
                                                        user_id: identity.userId,
                                                        role: "owner",
                                                        status: "active",
                                                        joined_at: "2026-04-01T00:00:00.000Z",
                                                        created_at: "2026-04-01T00:00:00.000Z",
                                                        updated_at: "2026-04-01T00:00:00.000Z",
                                                    },
                                                    error: null,
                                                }),
                                        })),
                                    })),
                                })),
                            })),
                        };
                    }
                    if (table === "boards") {
                        return {
                            select: jest.fn(() => ({
                                eq: jest.fn(() => ({
                                    is: jest.fn(() => ({
                                        maybeSingle: () =>
                                            trackQuery("boards.select", {
                                                data: {
                                                    id: boardUuid,
                                                    name: "Main Board",
                                                    owner_user_id: identity.userId,
                                                    created_at: "2026-04-01T00:00:00.000Z",
                                                    updated_at: "2026-04-01T00:00:00.000Z",
                                                    archived_at: null,
                                                },
                                                error: null,
                                            }),
                                    })),
                                })),
                            })),
                        };
                    }
                    throw new Error(`Unexpected table: ${table}`);
                }),
            };

            mockGetSupabaseServerClient.mockReturnValue(mockClient);

            const access = await requireBoardAccess(identity, boardUuid, ["owner"]);
            expect(access.board.id).toBe(boardUuid);
            expect(maxConcurrent).toBe(3);
        });

        it("listBoardMembersForIdentity skips redundant boards query after requireBoardAccess", async () => {
            const boardsQueries = jest.fn();
            const mockClient = {
                from: jest.fn((table: string) => {
                    if (table === "profiles") {
                        return {
                            upsert: jest.fn(() => ({
                                select: jest.fn(() => ({
                                    single: jest.fn().mockResolvedValue({
                                        data: {
                                            id: identity.userId,
                                            email: identity.email,
                                            display_name: identity.name,
                                            image_url: null,
                                            last_active_board_id: boardUuid,
                                        },
                                        error: null,
                                    }),
                                })),
                            })),
                            select: jest.fn(() => ({
                                in: jest.fn().mockResolvedValue({
                                    data: [
                                        {
                                            id: identity.userId,
                                            email: identity.email,
                                            display_name: identity.name,
                                            image_url: null,
                                        },
                                    ],
                                    error: null,
                                }),
                            })),
                        };
                    }
                    if (table === "board_members") {
                        return {
                            select: jest.fn(() => ({
                                eq: jest.fn(() => ({
                                    eq: jest.fn(() => ({
                                        eq: jest.fn(() => ({
                                            maybeSingle: jest.fn().mockResolvedValue({
                                                data: {
                                                    id: "member-1",
                                                    board_id: boardUuid,
                                                    user_id: identity.userId,
                                                    role: "owner",
                                                    status: "active",
                                                    joined_at: "2026-04-01T00:00:00.000Z",
                                                    created_at: "2026-04-01T00:00:00.000Z",
                                                    updated_at: "2026-04-01T00:00:00.000Z",
                                                },
                                                error: null,
                                            }),
                                        })),
                                        order: jest.fn().mockResolvedValue({
                                            data: [
                                                {
                                                    id: "member-1",
                                                    board_id: boardUuid,
                                                    user_id: identity.userId,
                                                    role: "owner",
                                                    status: "active",
                                                    joined_at: "2026-04-01T00:00:00.000Z",
                                                    created_at: "2026-04-01T00:00:00.000Z",
                                                    updated_at: "2026-04-01T00:00:00.000Z",
                                                },
                                            ],
                                            error: null,
                                        }),
                                    })),
                                })),
                            })),
                        };
                    }
                    if (table === "boards") {
                        boardsQueries();
                        return {
                            select: jest.fn(() => ({
                                eq: jest.fn(() => ({
                                    is: jest.fn(() => ({
                                        maybeSingle: jest.fn().mockResolvedValue({
                                            data: {
                                                id: boardUuid,
                                                name: "Main Board",
                                                owner_user_id: identity.userId,
                                                created_at: "2026-04-01T00:00:00.000Z",
                                                updated_at: "2026-04-01T00:00:00.000Z",
                                                archived_at: null,
                                            },
                                            error: null,
                                        }),
                                    })),
                                })),
                            })),
                        };
                    }
                    throw new Error(`Unexpected table: ${table}`);
                }),
            };

            mockGetSupabaseServerClient.mockReturnValue(mockClient);

            const members = await listBoardMembersForIdentity(identity, boardUuid);
            expect(members).toHaveLength(1);
            expect(boardsQueries).toHaveBeenCalledTimes(1);
        });
    });
});