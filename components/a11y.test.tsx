import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import React from "react";

import { GoogleAuthControls } from "@/components/google-auth-controls";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

jest.mock("@/context/ThemeProvider", () => ({
    useTheme: () => ({
        theme: "system",
        resolvedTheme: "dark",
        isLoaded: true,
        setTheme: jest.fn(),
    }),
}));

describe("Automated Accessibility Audits (axe)", () => {
    it("ThemeToggle passes axe a11y audit with no violations", async () => {
        const { container } = render(<ThemeToggle />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it("LocaleSwitcher passes axe a11y audit with no violations", async () => {
        const { container } = render(<LocaleSwitcher />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it("GoogleAuthControls passes axe a11y audit with no violations", async () => {
        const { container } = render(<GoogleAuthControls canUseGoogleAuth={true} />);
        // In JSDOM, both mobile and desktop responsive views exist in the DOM simultaneously.
        // Disable landmark-unique for this component fragment since in real browsers only one is visible.
        const results = await axe(container, {
            rules: {
                "landmark-unique": { enabled: false },
            },
        });
        expect(results).toHaveNoViolations();
    });
});
