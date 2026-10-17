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

        const regions = screen.getAllByRole("region", { name: "auth.sectionLabel" });
        expect(regions).toHaveLength(2);
        expect(regions[0]).toHaveClass("min-[981px]:hidden");
        expect(regions[1]).toHaveClass("hidden", "min-[981px]:flex");
        expect(
            screen.getByRole("button", { name: "auth.continueWithGoogle" }),
        ).toBeDisabled();
    });

    it("shows the loading state", () => {
        mockAuthState.status = "loading";

        render(<GoogleAuthControls canUseGoogleAuth />);

        const checkingButtons = screen.getAllByRole("button", { name: "auth.checking" });
        expect(checkingButtons.length).toBeGreaterThan(0);
        checkingButtons.forEach((btn) => expect(btn).toBeDisabled());
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

    it("shows a hamburger menu on mobile and stacks the controls inside it", async () => {
        render(<GoogleAuthControls canUseGoogleAuth />);

        const user = userEvent.setup({ delay: null });
        const menuButton = screen.getByRole("button", { name: "auth.sectionLabel" });
        expect(menuButton.closest("section")).toHaveClass("min-[981px]:hidden");

        await user.click(menuButton);

        expect(screen.getByRole("heading", { name: "auth.sectionLabel" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "auth.continueWithGoogle" })).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "auth.continueWithGoogle", hidden: true })).toHaveLength(2);
        expect(screen.getAllByText("Theme toggle")).toHaveLength(2);
        expect(screen.getAllByText("Locale switcher")).toHaveLength(2);
    });

    it("calls signIn for unauthenticated users when clicking GitHub", async () => {
        render(<GoogleAuthControls canUseGoogleAuth canUseGitHubAuth />);

        await userEvent.click(
            screen.getByRole("button", { name: "auth.continueWithGitHub" }),
        );

        expect(mockAuthState.signIn).toHaveBeenCalledWith("github", {
            callbackUrl: "/en",
        });
    });

    it("disables GitHub sign in button when canUseGitHubAuth is false", () => {
        render(<GoogleAuthControls canUseGoogleAuth canUseGitHubAuth={false} />);

        expect(
            screen.getByRole("button", { name: "auth.continueWithGitHub" }),
        ).toBeDisabled();
    });

    it("hides Password / Test Login when test auth is explicitly disabled", () => {
        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={false} />);

        expect(
            screen.queryByRole("button", { name: "auth.credentials.buttonLabel" }),
        ).not.toBeInTheDocument();
    });

    it("shows Password / Test Login when test auth is enabled", () => {
        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);

        expect(
            screen.getByRole("button", { name: "auth.credentials.buttonLabel" }),
        ).toBeInTheDocument();
    });

    it("toggles credentials dialog and switches between Sign In and Sign Up tabs", async () => {
        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);
        const user = userEvent.setup({ delay: null });

        await user.click(screen.getByRole("button", { name: "auth.credentials.buttonLabel" }));

        expect(screen.getByText("auth.credentials.signInTitle")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "auth.credentials.submitSignIn" })).toBeInTheDocument();

        // Switch to Sign Up
        await user.click(screen.getByRole("button", { name: "auth.credentials.signUpTab" }));

        expect(screen.getByText("auth.credentials.signUpTitle")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "auth.credentials.submitSignUp" })).toBeInTheDocument();
        expect(screen.getByLabelText("auth.credentials.confirmPasswordLabel")).toBeInTheDocument();

        // Switch back to Sign In
        await user.click(screen.getByRole("button", { name: "auth.credentials.signInTab" }));
        expect(screen.getByText("auth.credentials.signInTitle")).toBeInTheDocument();
    });

    it("validates password matching on sign up", async () => {
        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);
        const user = userEvent.setup({ delay: null });

        await user.click(screen.getByRole("button", { name: "auth.credentials.buttonLabel" }));
        await user.click(screen.getByRole("button", { name: "auth.credentials.signUpTab" }));

        await user.type(screen.getByLabelText("auth.credentials.emailLabel"), "mismatch@example.com");
        await user.type(screen.getByLabelText("auth.credentials.passwordLabel"), "password123");
        await user.type(screen.getByLabelText("auth.credentials.confirmPasswordLabel"), "differentpass");

        await user.click(screen.getByRole("button", { name: "auth.credentials.submitSignUp" }));

        expect(screen.getByText("auth.credentials.passwordsDoNotMatch")).toBeInTheDocument();
    });

    it("handles sign up registration error", async () => {
        const user = userEvent.setup({ delay: null });
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Email already registered" }),
        } as unknown as Response);

        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);

        await user.click(screen.getByRole("button", { name: "auth.credentials.buttonLabel" }));
        await user.click(screen.getByRole("button", { name: "auth.credentials.signUpTab" }));

        await user.type(screen.getByLabelText("auth.credentials.emailLabel"), "newuser@example.com");
        await user.type(screen.getByLabelText("auth.credentials.passwordLabel"), "password123");
        await user.type(screen.getByLabelText("auth.credentials.confirmPasswordLabel"), "password123");

        await user.click(screen.getByRole("button", { name: "auth.credentials.submitSignUp" }));

        expect(await screen.findByText("Email already registered")).toBeInTheDocument();

        global.fetch = originalFetch;
    });

    it("successfully creates account and triggers credentials sign in", async () => {
        const user = userEvent.setup({ delay: null });
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ user: { id: "123", email: "newuser@example.com" } }),
        } as unknown as Response);
        mockAuthState.signIn.mockResolvedValue({ error: "Sign in error" });

        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);

        await user.click(screen.getByRole("button", { name: "auth.credentials.buttonLabel" }));
        await user.click(screen.getByRole("button", { name: "auth.credentials.signUpTab" }));

        await user.type(screen.getByLabelText("auth.credentials.emailLabel"), "newuser@example.com");
        await user.type(screen.getByLabelText("auth.credentials.passwordLabel"), "password123");
        await user.type(screen.getByLabelText("auth.credentials.confirmPasswordLabel"), "password123");

        await user.click(screen.getByRole("button", { name: "auth.credentials.submitSignUp" }));

        expect(global.fetch).toHaveBeenCalledWith("/api/auth/register", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
                email: "newuser@example.com",
                password: "password123",
                name: null,
            }),
        }));

        expect(mockAuthState.signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({
            username: "newuser@example.com",
            password: "password123",
        }));
        expect(await screen.findByText("auth.credentials.accountCreatedSignInFailed")).toBeInTheDocument();

        global.fetch = originalFetch;
    });

    it("submits sign in with credentials", async () => {
        const user = userEvent.setup({ delay: null });
        mockAuthState.signIn.mockResolvedValue({ error: "Invalid credentials" });

        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);

        await user.click(screen.getByRole("button", { name: "auth.credentials.buttonLabel" }));

        await user.click(screen.getByRole("button", { name: "auth.credentials.submitSignIn" }));

        expect(mockAuthState.signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({
            username: "test",
            password: "password123",
        }));

        expect(await screen.findByText("auth.credentials.invalidCredentials")).toBeInTheDocument();
    });

    it("uses unique DOM IDs with prefix for desktop and mobile credentials forms", async () => {
        const user = userEvent.setup({ delay: null });
        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);

        const desktopCredButtons = screen.getAllByRole("button", { name: "auth.credentials.buttonLabel" });
        await user.click(desktopCredButtons[0]);

        expect(document.getElementById("desktop-credentials-username")).toBeInTheDocument();
        expect(document.getElementById("desktop-credentials-password")).toBeInTheDocument();

        const signUpButtons = screen.getAllByRole("button", { name: "auth.credentials.signUpTab" });
        await user.click(signUpButtons[0]);

        expect(document.getElementById("desktop-credentials-fullname")).toBeInTheDocument();
        expect(document.getElementById("desktop-credentials-confirm")).toBeInTheDocument();

        const menuButton = screen.getByRole("button", { name: "auth.sectionLabel" });
        await user.click(menuButton);

        // When mobile menu dialog is open, both desktop and mobile panels exist in DOM with distinct IDs
        expect(document.getElementById("desktop-credentials-fullname")).toBeInTheDocument();
        expect(document.getElementById("desktop-credentials-username")).toBeInTheDocument();
        expect(document.getElementById("desktop-credentials-password")).toBeInTheDocument();
        expect(document.getElementById("desktop-credentials-confirm")).toBeInTheDocument();

        expect(document.getElementById("mobile-credentials-fullname")).toBeInTheDocument();
        expect(document.getElementById("mobile-credentials-username")).toBeInTheDocument();
        expect(document.getElementById("mobile-credentials-password")).toBeInTheDocument();
        expect(document.getElementById("mobile-credentials-confirm")).toBeInTheDocument();
    });
});