import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeToggle } from "@/components/theme-toggle";

const setTheme = jest.fn();

jest.mock("@/context/ThemeProvider", () => ({
    useTheme: () => ({
        theme: "system",
        resolvedTheme: "dark",
        isLoaded: true,
        setTheme,
    }),
}));

describe("ThemeToggle", () => {
    it("renders the theme group without a preference summary", () => {
        render(<ThemeToggle />);

        expect(screen.getByRole("group")).toHaveAttribute(
            "aria-label",
            "theme.switcherLabel",
        );
        expect(screen.queryByText(/theme\.currentPreference/i)).not.toBeInTheDocument();
    });

    it("updates the theme when an option is clicked", async () => {
        render(<ThemeToggle />);

        const buttons = screen.getAllByRole("button");
        await userEvent.click(buttons[1]);

        expect(setTheme).toHaveBeenCalledWith("light");
    });
});