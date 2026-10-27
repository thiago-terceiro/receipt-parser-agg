import { createHash, randomBytes } from "node:crypto";

import {
    BOARD_INVITE_DURATION_DAYS,
    DEFAULT_BOARD_INVITE_ROLE,
    DEFAULT_BOARD_NAME,
    isBoardRole,
    isValidBoardId,
    normalizeBoardName,
    normalizeInviteEmail,
    type BoardMemberSummary,
    type BoardRole,
    type BoardSummary,
} from "@/lib/boards";
import { withSpan } from "@/lib/observability";
import { observabilityAttributes } from "@/lib/observability-schema";
import type { SessionIdentity } from "@/lib/session";
import { getSessionIdentity } from "@/lib/session";
import {
    getSupabaseServerClient,
    hasSupabaseServerConfig,
} from "@/lib/supabase-server";

type SupabaseClient = ReturnType<typeof getSupabaseServerClient>;

type ProfileRecord = {
    id: string;
    email: string | null;
    display_name: string | null;
    image_url: string | null;
    last_active_board_id: string | null;
};

type BoardRecord = {
    id: string;
    name: string;
    owner_user_id: string;
    created_at: string;
    updated_at: string;
    archived_at: string | null;
};

type BoardMembershipRecord = {
    id: string;
    board_id: string;
    user_id: string;
    role: BoardRole;
    status: "active" | "removed";
    joined_at: string | null;
    created_at: string;
    updated_at: string;
};

type BoardInviteRpcRecord = {
    board_id: string;
    board_name: string;
    role: BoardRole;
};

type PendingBoardInviteRecord = {
    id: string;
    board_id: string;
    email: string | null;
    role: BoardRole;
    invited_by_user_id: string;
};

type BoardCreateRpcRecord = BoardRecord;

type AuthenticatedBoardIdentity = SessionIdentity & {
    userId: string;
};

export type ActiveBoardSelection = {
    activeBoard: BoardSummary;
    boards: BoardSummary[];
};

export class BoardRouteError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "BoardRouteError";
        this.statusCode = statusCode;
    }

    get status(): number {
        return this.statusCode;
    }
}

const createSupabaseError = (error: { message?: string } | null, fallback: string) => {
    return new BoardRouteError(error?.message || fallback, 500);
};

const mapBoardSummary = (
    board: BoardRecord,
    membership: BoardMembershipRecord,
): BoardSummary => {
    return {
        id: board.id,
        name: board.name,
        ownerUserId: board.owner_user_id,
        role: membership.role,
        joinedAt: membership.joined_at,
        createdAt: board.created_at,
        updatedAt: board.updated_at,
        archivedAt: board.archived_at,
    };
};

const getInviteExpiryIso = () => {
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + BOARD_INVITE_DURATION_DAYS);
    return expiresAt.toISOString();
};

export const hashInviteTokenForStorage = (token: string) => {
    return createHash("sha256").update(token).digest("hex");
};

const createInviteToken = () => randomBytes(32).toString("base64url");

export const requireBoardIdentity = async (): Promise<AuthenticatedBoardIdentity> => {
    return withSpan("boards.require_identity", async (span) => {
        span.setAttributes({
            [observabilityAttributes.boardsConfigured]: hasSupabaseServerConfig,
        });

        if (!hasSupabaseServerConfig) {
            throw new BoardRouteError(
                "Boards are not configured on the server.",
                503,
            );
        }

        const identity = await getSessionIdentity();
        span.setAttributes({
            [observabilityAttributes.userIsAuthenticated]: Boolean(identity?.userId),
        });

        if (!identity?.userId) {
            throw new BoardRouteError("Sign in to use shared boards.", 401);
        }

        return {
            ...identity,
            userId: identity.userId,
        };
    });
};

export const ensureBoardProfile = async (
    client: SupabaseClient,
    identity: AuthenticatedBoardIdentity,
) => {
    return withSpan("boards.ensure_profile", async (span) => {
        const normalizedEmail = identity.email ? identity.email.trim().toLowerCase() : null;
        const upsertPayload = {
            id: identity.userId,
            email: normalizedEmail,
            display_name: identity.name,
            image_url: identity.image,
        };

        let { data, error } = await client
            .from("profiles")
            .upsert(upsertPayload, {
                ignoreDuplicates: false,
                onConflict: "id",
            })
            .select("id, email, display_name, image_url, last_active_board_id")
            .single();

        if (error && (error.code === "23505" || error.message?.includes("unique") || error.message?.includes("profiles_email_key"))) {
            const { data: fallbackById } = await client
                .from("profiles")
                .select("id, email, display_name, image_url, last_active_board_id")
                .eq("id", identity.userId)
                .maybeSingle();

            if (fallbackById) {
                data = fallbackById;
                error = null;
            } else if (normalizedEmail) {
                const { data: fallbackByEmail } = await client
                    .from("profiles")
                    .select("id, email, display_name, image_url, last_active_board_id")
                    .eq("email", normalizedEmail)
                    .maybeSingle();

                if (fallbackByEmail) {
                    data = fallbackByEmail;
                    identity.userId = fallbackByEmail.id;
                    error = null;
                }
            }
        }

        if (error || !data) {
            throw createSupabaseError(error, "Unable to prepare the board profile.");
        }

        span.setAttributes({
            [observabilityAttributes.profileHasLastActiveBoard]: Boolean(
                (data as ProfileRecord).last_active_board_id,
            ),
        });

        return data as ProfileRecord;
    });
};

const listBoardsForIdentityWithClient = async (
    client: SupabaseClient,
    identity: AuthenticatedBoardIdentity,
) => {
    const { data: memberships, error: membershipError } = await client
        .from("board_members")
        .select("id, board_id, user_id, role, status, joined_at, created_at, updated_at")
        .eq("user_id", identity.userId)
        .eq("status", "active");

    if (membershipError) {
        throw createSupabaseError(
            membershipError,
            "Unable to load board memberships.",
        );
    }

    const membershipRows = (memberships ?? []) as BoardMembershipRecord[];
    if (membershipRows.length === 0) {
        return [] as BoardSummary[];
    }

    const boardIds = membershipRows.map((membership) => membership.board_id);
    const { data: boards, error: boardError } = await client
        .from("boards")
        .select("id, name, owner_user_id, created_at, updated_at, archived_at")
        .in("id", boardIds)
        .is("archived_at", null);

    if (boardError) {
        throw createSupabaseError(boardError, "Unable to load boards.");
    }

    const boardMap = new Map(
        ((boards ?? []) as BoardRecord[]).map((board) => [board.id, board]),
    );

    return membershipRows
        .map((membership) => {
            const board = boardMap.get(membership.board_id);
            return board ? mapBoardSummary(board, membership) : null;
        })
        .filter((board): board is BoardSummary => board !== null)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

export const createBoardForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    boardName: unknown,
) => {
    return withSpan("boards.create", async (span) => {
        const normalizedName = normalizeBoardName(boardName);
        span.setAttributes({
            [observabilityAttributes.boardNameProvided]: Boolean(normalizedName),
        });

        if (!normalizedName) {
            throw new BoardRouteError(
                "Board name is required and must be 80 characters or fewer.",
                400,
            );
        }

        const client = getSupabaseServerClient();
        await ensureBoardProfile(client, identity);

        const { data, error } = await client
            .rpc("create_board_for_user", {
                p_name: normalizedName,
                p_user_id: identity.userId,
            })
            .single();

        if (error || !data) {
            throw createSupabaseError(error, "Unable to create the board.");
        }

        return data as BoardCreateRpcRecord;
    });
};

export const ensureDefaultBoardForIdentity = async (
    client: SupabaseClient,
    identity: AuthenticatedBoardIdentity,
) => {
    await createBoardForIdentity(identity, DEFAULT_BOARD_NAME);
    return listBoardsForIdentityWithClient(client, identity);
};

export const listBoardsForIdentity = async (identity: AuthenticatedBoardIdentity) => {
    return withSpan("boards.list_for_identity", async (span) => {
        const client = getSupabaseServerClient(identity);
        await ensureBoardProfile(client, identity);
        let boards = await listBoardsForIdentityWithClient(client, identity);

        if (boards.length === 0) {
            boards = await ensureDefaultBoardForIdentity(client, identity);
        }

        span.setAttributes({
            [observabilityAttributes.boardCount]: boards.length,
        });

        return boards;
    });
};

export const resolveActiveBoardForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    requestedBoardId?: unknown,
): Promise<ActiveBoardSelection> => {
    return withSpan("boards.resolve_active", async (span) => {
        span.setAttributes({
            [observabilityAttributes.boardRequested]: requestedBoardId != null,
        });

        if (requestedBoardId != null && !isValidBoardId(requestedBoardId)) {
            throw new BoardRouteError("Board id is invalid.", 400);
        }

        const client = getSupabaseServerClient(identity);
        let profile = await ensureBoardProfile(client, identity);
        let boards = await listBoardsForIdentityWithClient(client, identity);

        if (boards.length === 0) {
            boards = await ensureDefaultBoardForIdentity(client, identity);
            profile = await ensureBoardProfile(client, identity);
        }

        if (boards.length === 0) {
            throw new BoardRouteError(
                "Unable to resolve a board for this account.",
                500,
            );
        }

        let activeBoard: BoardSummary | undefined;

        if (requestedBoardId) {
            activeBoard = boards.find((board) => board.id === requestedBoardId);
            if (!activeBoard) {
                throw new BoardRouteError("You do not have access to that board.", 403);
            }
        }

        if (!activeBoard && profile.last_active_board_id) {
            activeBoard = boards.find(
                (board) => board.id === profile.last_active_board_id,
            );
        }

        activeBoard ||= boards[0];

        if (profile.last_active_board_id !== activeBoard.id) {
            await setLastActiveBoardForIdentity(identity, activeBoard.id);
        }

        span.setAttributes({
            [observabilityAttributes.boardCount]: boards.length,
            [observabilityAttributes.profileHasLastActiveBoard]: Boolean(profile.last_active_board_id),
        });

        return {
            activeBoard,
            boards,
        };
    });
};

const loadMembership = async (
    client: SupabaseClient,
    identity: AuthenticatedBoardIdentity,
    boardId: string,
) => {
    const { data, error } = await client
        .from("board_members")
        .select("id, board_id, user_id, role, status, joined_at, created_at, updated_at")
        .eq("board_id", boardId)
        .eq("user_id", identity.userId)
        .eq("status", "active")
        .maybeSingle();

    if (error) {
        throw createSupabaseError(error, "Unable to validate board membership.");
    }

    return (data as BoardMembershipRecord | null) ?? null;
};

const loadBoardRecord = async (client: SupabaseClient, boardId: string) => {
    const { data, error } = await client
        .from("boards")
        .select("id, name, owner_user_id, created_at, updated_at, archived_at")
        .eq("id", boardId)
        .is("archived_at", null)
        .maybeSingle();

    if (error) {
        throw createSupabaseError(error, "Unable to load the board.");
    }

    return (data as BoardRecord | null) ?? null;
};

export const requireBoardAccess = async (
    identity: AuthenticatedBoardIdentity,
    boardId: unknown,
    allowedRoles?: BoardRole[],
) => {
    return withSpan("boards.require_access", async (span) => {
        span.setAttributes({
            [observabilityAttributes.boardAllowedRoleCount]: allowedRoles?.length ?? 0,
        });

        if (!isValidBoardId(boardId)) {
            throw new BoardRouteError("Board id is invalid.", 400);
        }

        const client = getSupabaseServerClient(identity);
        await ensureBoardProfile(client, identity);

        const membership = await loadMembership(client, identity, boardId);
        if (!membership) {
            throw new BoardRouteError("You do not have access to that board.", 403);
        }

        if (allowedRoles && !allowedRoles.includes(membership.role)) {
            throw new BoardRouteError(
                "You do not have permission to perform that board action.",
                403,
            );
        }

        const board = await loadBoardRecord(client, boardId);
        if (!board) {
            throw new BoardRouteError("Board not found.", 404);
        }

        span.setAttributes({
            [observabilityAttributes.boardUserRole]: membership.role,
        });

        return {
            board,
            client,
            membership,
        };
    });
};

export const setLastActiveBoardForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    boardId: unknown,
) => {
    return withSpan("boards.set_last_active", async () => {
        const { board } = await requireBoardAccess(identity, boardId);

        const { error } = await getSupabaseServerClient().rpc("set_last_active_board", {
            p_board_id: board.id,
            p_user_id: identity.userId,
        });

        if (error) {
            throw createSupabaseError(
                error,
                "Unable to persist the active board selection.",
            );
        }

        return board;
    });
};

export const listBoardMembersForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    boardId: unknown,
) => {
    return withSpan("boards.members.list", async (span) => {
        const { board, client } = await requireBoardAccess(identity, boardId);
        const members = await listBoardMembersForResolvedBoard(client, board.id);

        span.setAttributes({
            [observabilityAttributes.boardMemberCount]: members.length,
        });

        return members;
    });
};

export const listBoardMembersForResolvedBoard = async (
    client: SupabaseClient,
    boardId: string,
) => {
    const board = await loadBoardRecord(client, boardId);
    if (!board) {
        throw new BoardRouteError("Board not found.", 404);
    }

    const { data: memberships, error: membershipError } = await client
        .from("board_members")
        .select("id, board_id, user_id, role, status, joined_at, created_at, updated_at")
        .eq("board_id", board.id)
        .eq("status", "active")
        .order("joined_at", { ascending: true, nullsFirst: false });

    if (membershipError) {
        throw createSupabaseError(
            membershipError,
            "Unable to load board members.",
        );
    }

    const membershipRows = (memberships ?? []) as BoardMembershipRecord[];
    const userIds = membershipRows.map((membership) => membership.user_id);

    const { data: profiles, error: profileError } = await client
        .from("profiles")
        .select("id, email, display_name, image_url")
        .in("id", userIds);

    if (profileError) {
        throw createSupabaseError(profileError, "Unable to load member profiles.");
    }

    const profileMap = new Map(
        ((profiles ?? []) as Array<{
            id: string;
            email: string | null;
            display_name: string | null;
            image_url: string | null;
        }>).map((profile) => [profile.id, profile]),
    );

    return membershipRows.map((membership) => {
        const profile = profileMap.get(membership.user_id);

        return {
            id: membership.id,
            userId: membership.user_id,
            boardId: membership.board_id,
            role: membership.role,
            status: membership.status,
            joinedAt: membership.joined_at,
            createdAt: membership.created_at,
            updatedAt: membership.updated_at,
            email: profile?.email ?? null,
            displayName: profile?.display_name ?? null,
            imageUrl: profile?.image_url ?? null,
        } satisfies BoardMemberSummary;
    });
};

export const createBoardInviteForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    boardId: unknown,
    email: unknown,
    requestedRole: unknown,
) => {
    return withSpan("boards.invites.create", async (span) => {
        const normalizedRole = isBoardRole(requestedRole)
            ? requestedRole
            : DEFAULT_BOARD_INVITE_ROLE;

        span.setAttributes({
            [observabilityAttributes.inviteHasEmailRestriction]: email != null,
            [observabilityAttributes.inviteRole]: normalizedRole,
        });

        if (normalizedRole !== "editor") {
            throw new BoardRouteError(
                "Only editor invites are supported right now.",
                400,
            );
        }

        const normalizedEmail = email == null ? null : normalizeInviteEmail(email);
        if (email != null && !normalizedEmail) {
            throw new BoardRouteError("Invite email address is invalid.", 400);
        }

        const { board, client } = await requireBoardAccess(identity, boardId, ["owner"]);
        const token = createInviteToken();
        const tokenHash = hashInviteTokenForStorage(token);
        const expiresAt = getInviteExpiryIso();

        const { data, error } = await client
            .from("board_invites")
            .insert({
                accepted_at: null,
                accepted_by_user_id: null,
                board_id: board.id,
                email: normalizedEmail,
                expires_at: expiresAt,
                invite_token_hash: tokenHash,
                invited_by_user_id: identity.userId,
                role: normalizedRole,
                status: "pending",
            })
            .select("id, board_id, email, role, status, expires_at, created_at")
            .single();

        if (error || !data) {
            throw createSupabaseError(error, "Unable to create the board invite.");
        }

        span.setAttributes({
            [observabilityAttributes.inviteCreated]: true,
        });

        return {
            email: data.email as string | null,
            expiresAt: data.expires_at as string,
            id: data.id as string,
            inviteUrl: `/invite?token=${encodeURIComponent(token)}`,
            role: data.role as BoardRole,
            status: data.status as string,
            token,
        };
    });
};

const loadPendingBoardInviteForToken = async (
    client: SupabaseClient,
    tokenHash: string,
) => {
    const { data, error } = await client
        .from("board_invites")
        .select("id, board_id, email, role, invited_by_user_id")
        .eq("invite_token_hash", tokenHash)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

    if (error) {
        throw createSupabaseError(error, "Unable to load the board invite.");
    }

    return (data as PendingBoardInviteRecord | null) ?? null;
};

export type PendingBoardInviteDetails = {
    boardId: string;
    boardName: string;
    role: BoardRole;
    email: string | null;
    status?: "pending" | "accepted" | "expired" | "invalid";
    isExpired?: boolean;
    isAccepted?: boolean;
};

export const getPendingBoardInviteDetails = async (
    token: unknown,
): Promise<PendingBoardInviteDetails | null> => {
    return withSpan("boards.invites.get_details", async (span) => {
        if (!hasSupabaseServerConfig || typeof token !== "string" || !token.trim()) {
            return null;
        }

        const client = getSupabaseServerClient();
        const tokenHash = hashInviteTokenForStorage(token.trim());
        const invite = await loadPendingBoardInviteForToken(client, tokenHash);

        if (!invite) {
            const { data: existingInvite } = await client
                .from("board_invites")
                .select("id, board_id, email, role, status, expires_at")
                .eq("invite_token_hash", tokenHash)
                .maybeSingle();

            if (existingInvite) {
                const isAccepted = existingInvite.status === "accepted";
                const isExpired =
                    !isAccepted &&
                    (existingInvite.status !== "pending" ||
                        new Date(existingInvite.expires_at).getTime() <= Date.now());
                const { data: board } = await client
                    .from("boards")
                    .select("id, name")
                    .eq("id", existingInvite.board_id)
                    .maybeSingle();

                const details: PendingBoardInviteDetails = {
                    boardId: existingInvite.board_id,
                    boardName: (board as { name?: string } | null)?.name || "Shared Board",
                    role: existingInvite.role,
                    email: existingInvite.email,
                    status: isAccepted ? "accepted" : isExpired ? "expired" : "pending",
                    isExpired,
                    isAccepted,
                };

                span.setAttributes({
                    [observabilityAttributes.inviteTokenPresent]: true,
                    [observabilityAttributes.inviteRole]: details.role,
                });

                return details;
            }

            return null;
        }

        const { data: board } = await client
            .from("boards")
            .select("id, name")
            .eq("id", invite.board_id)
            .maybeSingle();

        const details: PendingBoardInviteDetails = {
            boardId: invite.board_id,
            boardName: (board as { name?: string } | null)?.name || "Shared Board",
            role: invite.role,
            email: invite.email,
            status: "pending",
            isExpired: false,
            isAccepted: false,
        };

        span.setAttributes({
            [observabilityAttributes.inviteTokenPresent]: true,
            [observabilityAttributes.inviteRole]: details.role,
        });

        return details;
    });
};

const upsertBoardMembershipFromInvite = async (
    client: SupabaseClient,
    invite: Pick<PendingBoardInviteRecord, "board_id" | "role"> & {
        invited_by_user_id?: string | null;
    },
    userId: string,
) => {
    const { data: existingMembership, error: existingMembershipError } = await client
        .from("board_members")
        .select("role, joined_at")
        .eq("board_id", invite.board_id)
        .eq("user_id", userId)
        .maybeSingle();

    if (existingMembershipError) {
        throw createSupabaseError(
            existingMembershipError,
            "Unable to validate board membership.",
        );
    }

    const membershipRole =
        (existingMembership as { role?: string } | null)?.role === "owner"
            ? "owner"
            : invite.role;

    const joinedAt = (existingMembership as { joined_at?: string | null } | null)?.joined_at
        ?? new Date().toISOString();
    const { error } = await client
        .from("board_members")
        .upsert({
            board_id: invite.board_id,
            user_id: userId,
            role: membershipRole,
            status: "active",
            invited_by_user_id: invite.invited_by_user_id ?? null,
            joined_at: joinedAt,
        }, {
            ignoreDuplicates: false,
            onConflict: "board_id,user_id",
        });

    if (error) {
        throw createSupabaseError(error, "Unable to add you to the shared board.");
    }
};

export const acceptBoardInviteForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    token: unknown,
) => {
    return withSpan("boards.invites.accept", async (span) => {
        span.setAttributes({
            [observabilityAttributes.inviteTokenPresent]: typeof token === "string" && token.trim().length > 0,
        });

        if (typeof token !== "string" || !token.trim()) {
            throw new BoardRouteError("Invite token is required.", 400);
        }

        const client = getSupabaseServerClient();
        await ensureBoardProfile(client, identity);

        const tokenHash = hashInviteTokenForStorage(token.trim());
        const invite = await loadPendingBoardInviteForToken(client, tokenHash);

        if (!invite) {
            const { data: existingInvite } = await client
                .from("board_invites")
                .select("id, board_id, role, status, accepted_by_user_id, expires_at, invited_by_user_id")
                .eq("invite_token_hash", tokenHash)
                .maybeSingle();

            if (existingInvite) {
                if (existingInvite.status === "accepted") {
                    const { data: existingMember } = await client
                        .from("board_members")
                        .select("role, status")
                        .eq("board_id", existingInvite.board_id)
                        .eq("user_id", identity.userId)
                        .eq("status", "active")
                        .maybeSingle();

                    if (existingMember || existingInvite.accepted_by_user_id === identity.userId) {
                        if (!existingMember) {
                            await upsertBoardMembershipFromInvite(
                                client,
                                existingInvite,
                                identity.userId,
                            );
                        }

                        await client
                            .from("profiles")
                            .update({ last_active_board_id: existingInvite.board_id })
                            .eq("id", identity.userId);

                        const { data: board, error: boardError } = await client
                            .from("boards")
                            .select("id, name")
                            .eq("id", existingInvite.board_id)
                            .maybeSingle();

                        if (boardError) {
                            throw createSupabaseError(boardError, "Unable to load the board.");
                        }

                        if (!board) {
                            throw new BoardRouteError("Board not found.", 404);
                        }

                        return {
                            board_id: existingInvite.board_id as string,
                            board_name: board.name as string,
                            role: (existingMember?.role ?? existingInvite.role) as BoardRole,
                        };
                    }

                    throw new BoardRouteError(
                        "This invitation has already been accepted.",
                        409,
                    );
                }

                if (new Date(existingInvite.expires_at).getTime() <= Date.now()) {
                    throw new BoardRouteError(
                        "This invitation link has expired.",
                        410,
                    );
                }
            }

            throw new BoardRouteError("Invite token is invalid or expired.", 404);
        }

        const { data: existingMember, error: memberCheckError } = await client
            .from("board_members")
            .select("role, status")
            .eq("board_id", invite.board_id)
            .eq("user_id", identity.userId)
            .maybeSingle();

        if (memberCheckError) {
            throw createSupabaseError(
                memberCheckError,
                "Unable to validate board membership.",
            );
        }

        if (existingMember && existingMember.status === "active") {
            const { error: profileUpdateError } = await client
                .from("profiles")
                .update({ last_active_board_id: invite.board_id })
                .eq("id", identity.userId);

            if (profileUpdateError) {
                throw createSupabaseError(
                    profileUpdateError,
                    "Unable to persist the active board selection.",
                );
            }

            const { data: board, error: boardError } = await client
                .from("boards")
                .select("id, name")
                .eq("id", invite.board_id)
                .maybeSingle();

            if (boardError) {
                throw createSupabaseError(boardError, "Unable to load the board.");
            }

            if (!board) {
                throw new BoardRouteError("Board not found.", 404);
            }

            const data: BoardInviteRpcRecord = {
                board_id: invite.board_id,
                board_name: board.name as string,
                role: existingMember.role as BoardRole,
            };

            span.setAttributes({
                [observabilityAttributes.inviteAccepted]: true,
                [observabilityAttributes.inviteRole]: data.role,
            });

            return data;
        }

        if (
            invite.email
            && invite.email.toLowerCase() !== (identity.email ?? "").toLowerCase()
        ) {
            throw new BoardRouteError(
                "The signed-in email does not match this invite.",
                403,
            );
        }

        const { data: updatedInvites, error: inviteUpdateError } = await client
            .from("board_invites")
            .update({
                accepted_at: new Date().toISOString(),
                accepted_by_user_id: identity.userId,
                status: "accepted",
            })
            .eq("id", invite.id)
            .eq("status", "pending")
            .select("id");

        if (inviteUpdateError) {
            throw createSupabaseError(
                inviteUpdateError,
                "Unable to finalize the board invite.",
            );
        }

        if (!updatedInvites || updatedInvites.length === 0) {
            throw new BoardRouteError(
                "This invitation has already been accepted.",
                409,
            );
        }

        try {
            await upsertBoardMembershipFromInvite(client, invite, identity.userId);
        } catch (membershipError) {
            await client
                .from("board_invites")
                .update({
                    status: "pending",
                    accepted_at: null,
                    accepted_by_user_id: null,
                })
                .eq("id", invite.id);
            throw membershipError;
        }

        const { error: profileUpdateError } = await client
            .from("profiles")
            .update({ last_active_board_id: invite.board_id })
            .eq("id", identity.userId);

        if (profileUpdateError) {
            throw createSupabaseError(
                profileUpdateError,
                "Unable to persist the active board selection.",
            );
        }

        const { data: board, error: boardError } = await client
            .from("boards")
            .select("id, name")
            .eq("id", invite.board_id)
            .maybeSingle();

        if (boardError) {
            throw createSupabaseError(boardError, "Unable to load the board.");
        }

        if (!board) {
            throw new BoardRouteError("Board not found.", 404);
        }

        const data: BoardInviteRpcRecord = {
            board_id: board.id as string,
            board_name: board.name as string,
            role: invite.role,
        };

        span.setAttributes({
            [observabilityAttributes.inviteAccepted]: true,
            [observabilityAttributes.inviteRole]: data.role,
        });

        return data;
    });
};