import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { buildLocalizedUrl } from "@/lib/i18n/config";
import { mockNavigationState } from "@/test/mock-state";

jest.mock("@/components/locale-utils", () => {
    const actual = jest.requireActual("@/components/locale-utils");
    const mockPersistLocalePreference = jest.fn();

    return {
        ...actual,
        __mockPersistLocalePreference: mockPersistLocalePreference,
        persistLocalePreference: mockPersistLocalePreference,
    };
});

describe("LocaleSwitcher", () => {
    const { __mockPersistLocalePreference } = jest.requireMock(
        "@/components/locale-utils",
    ) as { __mockPersistLocalePreference: jest.Mock };

    beforeEach(() => {
        __mockPersistLocalePreference.mockClear();
    });

    it("renders a button for each app locale", () => {
        render(<LocaleSwitcher />);

        expect(screen.getByRole("button", { name: "locales.en" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getByRole("button", { name: "locales.es" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "locales.pt-BR" })).toBeInTheDocument();
    });

    it("persists the locale and replaces the route", async () => {
        mockNavigationState.pathname = "/en/groceries";
        mockNavigationState.search = "month=2026-04";

        render(<LocaleSwitcher />);

        await userEvent.click(screen.getByRole("button", { name: "locales.es" }));

        expect(__mockPersistLocalePreference).toHaveBeenCalledWith("es");
        expect(mockNavigationState.router.replace).toHaveBeenCalledWith(
            buildLocalizedUrl("/en/groceries", "es", "month=2026-04"),
        );
    });
});