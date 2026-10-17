jest.mock("next-intl/server", () => ({
    setRequestLocale: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
    getSessionIdentity: jest.fn(),
}));

jest.mock("@/lib/boards-server", () => ({
    getPendingBoardInviteDetails: jest.fn(),
}));

import InvitePage from "@/app/[locale]/invite/page";
import { getPendingBoardInviteDetails } from "@/lib/boards-server";
import { getSessionIdentity } from "@/lib/session";

describe("InvitePage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders invite page and loads invite details without burning token on GET", async () => {
        (getSessionIdentity as jest.Mock).mockResolvedValue({
            email: "person@example.com",
            image: null,
            name: "Test Person",
            userId: "user-123",
        });
        (getPendingBoardInviteDetails as jest.Mock).mockResolvedValue({
            boardId: "board-123",
            boardName: "Test Board",
            role: "editor",
            email: "person@example.com",
        });

        const page = await InvitePage({
            params: Promise.resolve({ locale: "en" }),
            searchParams: Promise.resolve({ token: "invite-token" }),
        });

        expect(getPendingBoardInviteDetails).toHaveBeenCalledWith("invite-token");
        expect(page.props.children.props.inviteDetails).toEqual({
            boardId: "board-123",
            boardName: "Test Board",
            role: "editor",
            email: "person@example.com",
        });
        expect(page.props.children.props.initialSignedInEmail).toBe("person@example.com");
        expect(page.props.children.props.initialStatus).toBe("authenticated");
        expect(page.props.children.props.isTestAuthEnabled).toBe(true);
        expect(page.props.children.props.token).toBe("invite-token");
    });

    it("handles unauthenticated visitors safely without accepting and redacts invitee email", async () => {
        (getSessionIdentity as jest.Mock).mockResolvedValue(null);
        (getPendingBoardInviteDetails as jest.Mock).mockResolvedValue({
            boardId: "board-123",
            boardName: "Test Board",
            role: "editor",
            email: "secret-invitee@example.com",
        });

        const page = await InvitePage({
            params: Promise.resolve({ locale: "en" }),
            searchParams: Promise.resolve({ token: "invite-token" }),
        });

        expect(page.props.children.props.initialSignedInEmail).toBeNull();
        expect(page.props.children.props.initialStatus).toBe("unauthenticated");
        expect(page.props.children.props.token).toBe("invite-token");
        expect(page.props.children.props.inviteDetails.email).toBeNull();
    });
});