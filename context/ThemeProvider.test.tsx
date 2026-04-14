import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider, useTheme } from "@/context/ThemeProvider";

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

    it("persists a new theme selection", async () => {
        const Probe = () => {
            const { setTheme } = useTheme();
            return <button onClick={() => setTheme("light")}>light</button>;
        };

        render(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );

        await userEvent.click(screen.getByRole("button", { name: "light" }));

        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            "receipt-ai-theme",
            "light",
        );
    });
});