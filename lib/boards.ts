export const BOARD_NAME_MAX_LENGTH = 80;
export const BOARD_INVITE_DURATION_DAYS = 7;
export const DEFAULT_BOARD_NAME = "My groceries";
export const DEFAULT_BOARD_INVITE_ROLE = "editor";

export type BoardRole = "owner" | "editor";
export type BoardMemberStatus = "active" | "removed";
export type BoardInviteStatus = "pending" | "accepted" | "expired" | "revoked";

export type BoardSummary = {
    id: string;
    name: string;
    ownerUserId: string;
    role: BoardRole;
    joinedAt: string | null;
    createdAt: string;
    updatedAt: string;
    archivedAt: string | null;
};

export type BoardMemberSummary = {
    id: string;
    userId: string;
    boardId: string;
    role: BoardRole;
    status: BoardMemberStatus;
    joinedAt: string | null;
    createdAt: string;
    updatedAt: string;
    email: string | null;
    displayName: string | null;
    imageUrl: string | null;
};

export type BoardInviteSummary = {
    id: string;
    boardId: string;
    email: string | null;
    role: BoardRole;
    status: BoardInviteStatus;
    expiresAt: string;
    createdAt: string;
};

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

export const normalizeBoardName = (value: unknown) => {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = collapseWhitespace(value);
    if (!normalized || normalized.length > BOARD_NAME_MAX_LENGTH) {
        return null;
    }

    return normalized;
};

export const normalizeInviteEmail = (value: unknown) => {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = collapseWhitespace(value).toLowerCase();
    if (!normalized) {
        return null;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
};

export const isBoardRole = (value: unknown): value is BoardRole => {
    return value === "owner" || value === "editor";
};

export const isValidBoardId = (value: unknown): value is string => {
    if (typeof value !== "string") {
        return false;
    }

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value.trim(),
    );
};