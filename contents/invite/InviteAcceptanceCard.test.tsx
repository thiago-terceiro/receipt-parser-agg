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
});