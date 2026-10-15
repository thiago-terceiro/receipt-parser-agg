import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GoogleAuthControls } from "@/components/google-auth-controls";
import { mockAuthState } from "@/test/mock-state";

const setViewportMatch = (matches: boolean) => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation(() => ({
            matches,
            media: "(max-width: 700px)",
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
};

jest.mock("@/components/locale-switcher", () => ({
    LocaleSwitcher: () => <div>Locale switcher</div>,
}));

jest.mock("@/components/theme-toggle", () => ({
    ThemeToggle: () => <div>Theme toggle</div>,
}));

describe("GoogleAuthControls", () => {
    beforeEach(() => {
        setViewportMatch(false);
    });

    it("shows setup guidance when Google auth is unavailable", () => {
        render(<GoogleAuthControls canUseGoogleAuth={false} />);

        expect(
            screen.getByRole("region", { name: "auth.sectionLabel" }),
        ).toBeInTheDocument();
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
        setViewportMatch(true);

        render(<GoogleAuthControls canUseGoogleAuth />);

        const user = userEvent.setup({ delay: null });
        const menuButton = screen.getByRole("button", { name: "auth.sectionLabel" });

        expect(
            screen.queryByRole("button", { name: "auth.continueWithGoogle" }),
        ).not.toBeInTheDocument();

        await user.click(menuButton);

        expect(screen.getByRole("heading", { name: "auth.sectionLabel" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "auth.continueWithGoogle" })).toBeInTheDocument();
        expect(screen.getByText("Theme toggle")).toBeInTheDocument();
        expect(screen.getByText("Locale switcher")).toBeInTheDocument();
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
            screen.queryByRole("button", { name: "Password / Test Login" }),
        ).not.toBeInTheDocument();
    });

    it("shows Password / Test Login when test auth is enabled", () => {
        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);

        expect(
            screen.getByRole("button", { name: "Password / Test Login" }),
        ).toBeInTheDocument();
    });

    it("toggles credentials dialog and switches between Sign In and Sign Up tabs", async () => {
        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);
        const user = userEvent.setup({ delay: null });

        await user.click(screen.getByRole("button", { name: "Password / Test Login" }));

        expect(screen.getByText("Sign in with Password")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();

        // Switch to Sign Up
        await user.click(screen.getByRole("button", { name: "Sign Up" }));

        expect(screen.getByText("Create an Account")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
        expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();

        // Switch back to Sign In
        await user.click(screen.getByRole("button", { name: "Sign In" }));
        expect(screen.getByText("Sign in with Password")).toBeInTheDocument();
    });

    it("validates password matching on sign up", async () => {
        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);
        const user = userEvent.setup({ delay: null });

        await user.click(screen.getByRole("button", { name: "Password / Test Login" }));
        await user.click(screen.getByRole("button", { name: "Sign Up" }));

        await user.type(screen.getByLabelText("Email"), "mismatch@example.com");
        await user.type(screen.getByLabelText("Password"), "password123");
        await user.type(screen.getByLabelText("Confirm Password"), "differentpass");

        await user.click(screen.getByRole("button", { name: "Create Account" }));

        expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });

    it("handles sign up registration error", async () => {
        const user = userEvent.setup({ delay: null });
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Email already registered" }),
        } as unknown as Response);

        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);

        await user.click(screen.getByRole("button", { name: "Password / Test Login" }));
        await user.click(screen.getByRole("button", { name: "Sign Up" }));

        await user.type(screen.getByLabelText("Email"), "newuser@example.com");
        await user.type(screen.getByLabelText("Password"), "password123");
        await user.type(screen.getByLabelText("Confirm Password"), "password123");

        await user.click(screen.getByRole("button", { name: "Create Account" }));

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

        await user.click(screen.getByRole("button", { name: "Password / Test Login" }));
        await user.click(screen.getByRole("button", { name: "Sign Up" }));

        await user.type(screen.getByLabelText("Email"), "newuser@example.com");
        await user.type(screen.getByLabelText("Password"), "password123");
        await user.type(screen.getByLabelText("Confirm Password"), "password123");

        await user.click(screen.getByRole("button", { name: "Create Account" }));

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
        expect(await screen.findByText("Account created, but sign-in failed. Please sign in manually.")).toBeInTheDocument();

        global.fetch = originalFetch;
    });

    it("submits sign in with credentials", async () => {
        const user = userEvent.setup({ delay: null });
        mockAuthState.signIn.mockResolvedValue({ error: "Invalid credentials" });

        render(<GoogleAuthControls canUseGoogleAuth isTestAuthEnabled={true} />);

        await user.click(screen.getByRole("button", { name: "Password / Test Login" }));

        await user.click(screen.getByRole("button", { name: "Sign in" }));

        expect(mockAuthState.signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({
            username: "test",
            password: "password123",
        }));

        expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
    });
});