jest.mock("next-intl/server", () => ({
    setRequestLocale: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
    getSessionIdentity: jest.fn(),
}));

jest.mock("@/lib/boards-server", () => ({
    acceptBoardInviteForIdentity: jest.fn(),
}));

import InvitePage from "@/app/[locale]/invite/page";
import { redirect } from "@/i18n/navigation";
import { acceptBoardInviteForIdentity } from "@/lib/boards-server";
import { getSessionIdentity } from "@/lib/session";

describe("InvitePage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("redirects authenticated users after accepting the invite on the server", async () => {
        const redirectSignal = new Error("redirect");
        const redirectMock = redirect as unknown as jest.Mock;

        redirectMock.mockImplementation(() => {
            throw redirectSignal;
        });
        (getSessionIdentity as jest.Mock).mockResolvedValue({
            email: "person@example.com",
            image: null,
            name: "Test Person",
            userId: "user-123",
        });
        (acceptBoardInviteForIdentity as jest.Mock).mockResolvedValue({
            board_id: "board-123",
        });

        await expect(
            InvitePage({
                params: Promise.resolve({ locale: "en" }),
                searchParams: Promise.resolve({ token: "invite-token" }),
            }),
        ).rejects.toBe(redirectSignal);

        expect(acceptBoardInviteForIdentity).toHaveBeenCalledWith(
            {
                email: "person@example.com",
                image: null,
                name: "Test Person",
                userId: "user-123",
            },
            "invite-token",
        );
        expect(redirectMock).toHaveBeenCalledWith({
            href: {
                pathname: "/groceries",
                query: { board: "board-123" },
            },
            locale: "en",
        });
    });

    it("passes a server-side acceptance error into the invite card props", async () => {
        (getSessionIdentity as jest.Mock).mockResolvedValue({
            email: "person@example.com",
            image: null,
            name: "Test Person",
            userId: "user-123",
        });
        (acceptBoardInviteForIdentity as jest.Mock).mockRejectedValue(
            new Error("The signed-in email does not match this invite."),
        );

        const page = await InvitePage({
            params: Promise.resolve({ locale: "en" }),
            searchParams: Promise.resolve({ token: "invite-token" }),
        });

        expect(page.props.children.props.initialError).toBe(
            "The signed-in email does not match this invite.",
        );
        expect(page.props.children.props.initialSignedInEmail).toBe("person@example.com");
        expect(page.props.children.props.initialStatus).toBe("authenticated");
        expect(page.props.children.props.token).toBe("invite-token");
    });
});