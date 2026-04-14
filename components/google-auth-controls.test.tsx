import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GoogleAuthControls } from "@/components/google-auth-controls";
import { mockAuthState } from "@/test/mock-state";

jest.mock("@/components/locale-switcher", () => ({
    LocaleSwitcher: () => <div>Locale switcher</div>,
}));

jest.mock("@/components/theme-toggle", () => ({
    ThemeToggle: () => <div>Theme toggle</div>,
}));

describe("GoogleAuthControls", () => {
    it("shows setup guidance when Google auth is unavailable", () => {
        render(<GoogleAuthControls canUseGoogleAuth={false} />);

        expect(screen.getByText("auth.title")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "auth.continueWithGoogle" }),
        ).toBeDisabled();
    });

    it("shows the loading state", () => {
        mockAuthState.status = "loading";

        render(<GoogleAuthControls canUseGoogleAuth />);

        expect(screen.getByRole("button", { name: "auth.checking" })).toBeDisabled();
    });

    it("calls signIn for unauthenticated users", async () => {
        render(<GoogleAuthControls canUseGoogleAuth />);

        await userEvent.click(
            screen.getByRole("button", { name: "auth.continueWithGoogle" }),
        );

        expect(mockAuthState.signIn).toHaveBeenCalledWith("google", {
            callbackUrl: "/en",
        });
    });

    it("shows the authenticated user and calls signOut", async () => {
        mockAuthState.status = "authenticated";
        mockAuthState.session = {
            expires: "2026-05-01T00:00:00.000Z",
            user: {
                email: "person@example.com",
                name: "Test Person",
            },
        };

        render(<GoogleAuthControls canUseGoogleAuth />);

        expect(screen.getByText("Test Person")).toBeInTheDocument();
        expect(screen.getByText("person@example.com")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "auth.signOut" }));

        expect(mockAuthState.signOut).toHaveBeenCalledWith({ callbackUrl: "/en" });
    });
});