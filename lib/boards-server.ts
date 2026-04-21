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
    if (!hasSupabaseServerConfig) {
        throw new BoardRouteError(
            "Boards are not configured on the server.",
            503,
        );
    }

    const identity = await getSessionIdentity();
    if (!identity?.userId) {
        throw new BoardRouteError("Sign in to use shared boards.", 401);
    }

    return {
        ...identity,
        userId: identity.userId,
    };
};

export const ensureBoardProfile = async (
    client: SupabaseClient,
    identity: AuthenticatedBoardIdentity,
) => {
    const upsertPayload = {
        id: identity.userId,
        email: identity.email,
        display_name: identity.name,
        image_url: identity.image,
    };

    const { data, error } = await client
        .from("profiles")
        .upsert(upsertPayload, {
            ignoreDuplicates: false,
            onConflict: "id",
        })
        .select("id, email, display_name, image_url, last_active_board_id")
        .single();

    if (error || !data) {
        throw createSupabaseError(error, "Unable to prepare the board profile.");
    }

    return data as ProfileRecord;
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

export const listBoardsForIdentity = async (identity: AuthenticatedBoardIdentity) => {
    const client = getSupabaseServerClient();
    await ensureBoardProfile(client, identity);

    return listBoardsForIdentityWithClient(client, identity);
};

export const createBoardForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    boardName: unknown,
) => {
    const normalizedName = normalizeBoardName(boardName);
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
};

export const resolveActiveBoardForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    requestedBoardId?: unknown,
): Promise<ActiveBoardSelection> => {
    if (requestedBoardId != null && !isValidBoardId(requestedBoardId)) {
        throw new BoardRouteError("Board id is invalid.", 400);
    }

    const client = getSupabaseServerClient();
    let profile = await ensureBoardProfile(client, identity);
    let boards = await listBoardsForIdentityWithClient(client, identity);

    if (boards.length === 0) {
        await createBoardForIdentity(identity, DEFAULT_BOARD_NAME);
        profile = await ensureBoardProfile(client, identity);
        boards = await listBoardsForIdentityWithClient(client, identity);
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

    return {
        activeBoard,
        boards,
    };
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
    if (!isValidBoardId(boardId)) {
        throw new BoardRouteError("Board id is invalid.", 400);
    }

    const client = getSupabaseServerClient();
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

    return {
        board,
        client,
        membership,
    };
};

export const setLastActiveBoardForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    boardId: unknown,
) => {
    const { board, client } = await requireBoardAccess(identity, boardId);

    const { error } = await client.rpc("set_last_active_board", {
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
};

export const listBoardMembersForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    boardId: unknown,
) => {
    const { board, client } = await requireBoardAccess(identity, boardId);

    return listBoardMembersForResolvedBoard(client, board.id);
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
    const normalizedRole = isBoardRole(requestedRole)
        ? requestedRole
        : DEFAULT_BOARD_INVITE_ROLE;

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

    return {
        email: data.email as string | null,
        expiresAt: data.expires_at as string,
        id: data.id as string,
        inviteUrl: `/invite?token=${encodeURIComponent(token)}`,
        role: data.role as BoardRole,
        status: data.status as string,
        token,
    };
};

export const acceptBoardInviteForIdentity = async (
    identity: AuthenticatedBoardIdentity,
    token: unknown,
) => {
    if (typeof token !== "string" || !token.trim()) {
        throw new BoardRouteError("Invite token is required.", 400);
    }

    const client = getSupabaseServerClient();
    await ensureBoardProfile(client, identity);

    const tokenHash = hashInviteTokenForStorage(token.trim());
    const { data, error } = await client
        .rpc("accept_board_invite", {
            p_email: identity.email,
            p_token_hash: tokenHash,
            p_user_id: identity.userId,
        })
        .single();

    if (error || !data) {
        throw createSupabaseError(error, "Unable to accept the board invite.");
    }

    return data as BoardInviteRpcRecord;
};