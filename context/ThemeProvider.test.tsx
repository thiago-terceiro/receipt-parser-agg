import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
    THEME_COOKIE_NAME,
    ThemeProvider,
    isTheme,
    useTheme,
} from "@/context/ThemeProvider";

describe("ThemeProvider", () => {
    it("throws when the hook is used outside the provider", () => {
        const Probe = () => {
            useTheme();
            return null;
        };

        expect(() => render(<Probe />)).toThrow(
            "useTheme must be used within ThemeProvider.",
        );
    });

    it("reads the stored theme and updates the document", async () => {
        (window.localStorage.getItem as jest.Mock).mockReturnValue("dark");

        const Probe = () => {
            const { theme, resolvedTheme } = useTheme();
            return (
                <>
                    <span>{theme}</span>
                    <span>{resolvedTheme}</span>
                </>
            );
        };

        render(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );

        expect(screen.getAllByText("dark")).toHaveLength(2);
        await waitFor(() => {
            expect(document.documentElement.dataset.theme).toBe("dark");
        });
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("persists a new theme selection and synchronously updates the document", async () => {
        const Probe = () => {
            const { setTheme } = useTheme();
            return (
                <>
                    <button onClick={() => setTheme("dark")}>dark</button>
                    <button onClick={() => setTheme("light")}>light</button>
                </>
            );
        };

        render(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );

        await userEvent.click(screen.getByRole("button", { name: "dark" }));

        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(document.documentElement.classList.contains("dark")).toBe(true);
        expect(document.cookie).toContain("receipt-ai-theme=dark");
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            "receipt-ai-theme",
            "dark",
        );

        await userEvent.click(screen.getByRole("button", { name: "light" }));

        expect(document.documentElement.dataset.theme).toBe("light");
        expect(document.documentElement.classList.contains("dark")).toBe(false);
        expect(document.cookie).toContain("receipt-ai-theme=light");
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            "receipt-ai-theme",
            "light",
        );
    });

    it("exports valid isTheme validator and THEME_COOKIE_NAME", () => {
        expect(THEME_COOKIE_NAME).toBe("receipt-ai-theme");
        expect(isTheme("dark")).toBe(true);
        expect(isTheme("light")).toBe(true);
        expect(isTheme("system")).toBe(true);
        expect(isTheme("purple")).toBe(true);
        expect(isTheme("invalid")).toBe(false);
        expect(isTheme(null)).toBe(false);
        expect(isTheme(undefined)).toBe(false);
    });
});