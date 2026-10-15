import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InviteAcceptanceCard } from "@/contents/invite/InviteAcceptanceCard";
import { mockAuthState, mockNavigationState } from "@/test/mock-state";
import { renderWithProviders } from "@/test/render";

describe("InviteAcceptanceCard", () => {
    it("preserves the invite URL when prompting an unauthenticated user to sign in", async () => {
        renderWithProviders(
            <InviteAcceptanceCard canUseGoogleAuth locale="en" token="invite-token" />,
            { withThemeProvider: true },
        );

        await userEvent.click(
            screen.getByRole("button", { name: "auth.continueWithGoogle" }),
        );

        expect(mockAuthState.signIn).toHaveBeenCalledWith("google", {
            callbackUrl: "/en/invite?token=invite-token",
        });
    });

    it("shows an authenticated retry state from a server-side acceptance error", async () => {
        mockAuthState.status = "loading";

        renderWithProviders(
            <InviteAcceptanceCard
                canUseGoogleAuth
                initialError="Unable to accept the invite."
                initialSignedInEmail="person@example.com"
                initialStatus="authenticated"
                locale="en"
                token="invite-token"
            />,
            { withThemeProvider: true },
        );

        expect(screen.getByText("Unable to accept the invite.")).toBeInTheDocument();
        expect(screen.getByText("Current signed-in email: person@example.com")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Retry invite check" }));

        expect(mockNavigationState.router.refresh).toHaveBeenCalledTimes(1);
    });

    it("offers a sign-out path for invite email mismatch errors", async () => {
        mockAuthState.status = "authenticated";
        mockAuthState.session = {
            expires: "2026-05-01T00:00:00.000Z",
            user: {
                email: "wrong@example.com",
                name: "Wrong User",
            },
        };

        renderWithProviders(
            <InviteAcceptanceCard
                canUseGoogleAuth
                initialError="The signed-in email does not match this invite."
                initialStatus="authenticated"
                locale="en"
                token="invite-token"
            />,
            { withThemeProvider: true },
        );

        await userEvent.click(
            screen.getByRole("button", { name: "Sign out and use another account" }),
        );

        expect(mockAuthState.signOut).toHaveBeenCalledWith({
            callbackUrl: "/en/invite?token=invite-token",
        });
    });

    describe("Accept Invitation button click", () => {
        const originalFetch = global.fetch;

        afterEach(() => {
            global.fetch = originalFetch;
        });

        it("accepts invitation on button click and navigates to the board", async () => {
            mockAuthState.status = "authenticated";
            mockAuthState.session = {
                expires: "2026-05-01T00:00:00.000Z",
                user: {
                    email: "person@example.com",
                    name: "Test Person",
                },
            };

            const fetchMock = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    invite: {
                        board_id: "board-abc",
                        board_name: "Weekly Groceries",
                        role: "editor",
                    },
                }),
            });
            global.fetch = fetchMock;

            renderWithProviders(
                <InviteAcceptanceCard
                    canUseGoogleAuth
                    inviteDetails={{
                        boardId: "board-abc",
                        boardName: "Weekly Groceries",
                        role: "editor",
                        email: null,
                    }}
                    locale="en"
                    token="invite-token-123"
                />,
                { withThemeProvider: true },
            );

            expect(screen.getByText("Board: Weekly Groceries")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Accept Invitation" })).toBeInTheDocument();

            await userEvent.click(screen.getByRole("button", { name: "Accept Invitation" }));

            expect(fetchMock).toHaveBeenCalledWith("/api/invites/accept", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token: "invite-token-123" }),
            });

            expect(mockNavigationState.router.push).toHaveBeenCalledWith(
                "/en/groceries?board=board-abc",
            );
        });

        it("displays error when accepting invitation fails", async () => {
            mockAuthState.status = "authenticated";
            mockAuthState.session = {
                expires: "2026-05-01T00:00:00.000Z",
                user: {
                    email: "person@example.com",
                    name: "Test Person",
                },
            };

            const fetchMock = jest.fn().mockResolvedValue({
                ok: false,
                json: async () => ({
                    error: "Invite token is invalid or expired.",
                }),
            });
            global.fetch = fetchMock;

            renderWithProviders(
                <InviteAcceptanceCard
                    canUseGoogleAuth
                    locale="en"
                    token="expired-token"
                />,
                { withThemeProvider: true },
            );

            await userEvent.click(screen.getByRole("button", { name: "Accept Invitation" }));

            expect(await screen.findByText("Invite token is invalid or expired.")).toBeInTheDocument();
        });

        it("disables Accept Invitation and shows mismatch alert when emails do not match", () => {
            mockAuthState.status = "authenticated";
            mockAuthState.session = {
                expires: "2026-05-01T00:00:00.000Z",
                user: {
                    email: "current@example.com",
                    name: "Current User",
                },
            };

            renderWithProviders(
                <InviteAcceptanceCard
                    canUseGoogleAuth
                    inviteDetails={{
                        boardId: "board-123",
                        boardName: "Family Board",
                        role: "editor",
                        email: "invited@example.com",
                    }}
                    locale="en"
                    token="token-abc"
                />,
                { withThemeProvider: true },
            );

            expect(
                screen.getByText(
                    "This invite belongs to a different email address than the one currently signed in. Sign out and continue with the invited Google account, then open the invite link again.",
                ),
            ).toBeInTheDocument();

            const acceptButton = screen.getByRole("button", { name: "Accept Invitation" });
            expect(acceptButton).toBeDisabled();
            expect(
                screen.getByRole("button", { name: "Sign out and use another account" }),
            ).toBeInTheDocument();
        });

        it("forwards isTestAuthEnabled to GoogleAuthControls in unauthenticated state", () => {
            mockAuthState.status = "unauthenticated";

            renderWithProviders(
                <InviteAcceptanceCard
                    canUseGoogleAuth
                    isTestAuthEnabled={false}
                    locale="en"
                    token="token-xyz"
                />,
                { withThemeProvider: true },
            );

            expect(
                screen.queryByRole("button", { name: "Password / Test Login" }),
            ).not.toBeInTheDocument();
        });
    });
});

