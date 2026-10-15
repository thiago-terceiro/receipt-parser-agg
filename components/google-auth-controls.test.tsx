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

    it("shows a hamburger menu on mobile and stacks the controls inside it", async () => {
        setViewportMatch(true);

        render(<GoogleAuthControls canUseGoogleAuth />);

        const user = userEvent.setup();
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
});