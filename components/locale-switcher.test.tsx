import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";


import { LocaleSwitcher } from "@/components/locale-switcher";
import { mockNavigationState } from "@/test/mock-state";

import type { PropsWithChildren } from "react";

type MockSelectRootProps = PropsWithChildren<{
    value?: string;
    onValueChange?: (value: string) => void;
}>;

type MockSelectItemProps = PropsWithChildren<{
    value: string;
}>;

const mockSelectState = {
    onValueChange: undefined as ((value: string) => void) | undefined,
    value: "",
};

jest.mock("@/components/ui/select", () => ({
    Select: ({ children, onValueChange, value }: MockSelectRootProps) => {
        mockSelectState.onValueChange = onValueChange;
        mockSelectState.value = value ?? "";
        return <div>{children}</div>;
    },
    SelectContent: ({ children }: PropsWithChildren) => (
        <div role="listbox" id="mock-locale-listbox">
            {children}
        </div>
    ),
    SelectItem: ({ children, value }: MockSelectItemProps) => (
        <div role="option" aria-selected={mockSelectState.value === value} data-value={value}>
            {children}
        </div>
    ),
    SelectTrigger: ({ children, ...props }: React.ComponentProps<"button">) => (
        <button
            type="button"
            role="combobox"
            aria-controls="mock-locale-listbox"
            aria-expanded="false"
            {...props}
        >
            {children}
        </button>
    ),
    SelectValue: ({ children }: PropsWithChildren) => <>{children}</>,
}));

jest.mock("@/components/locale-utils", () => {
    const actual = jest.requireActual("@/components/locale-utils");
    const mockSyncDocumentLocale = jest.fn();

    return {
        ...actual,
        __mockSyncDocumentLocale: mockSyncDocumentLocale,
        syncDocumentLocale: mockSyncDocumentLocale,
    };
});

describe("LocaleSwitcher", () => {
    const { __mockSyncDocumentLocale } = jest.requireMock(
        "@/components/locale-utils",
    ) as { __mockSyncDocumentLocale: jest.Mock };

    beforeEach(() => {
        __mockSyncDocumentLocale.mockClear();
        mockSelectState.onValueChange = undefined;
        mockSelectState.value = "";
    });

    it("renders both mobile select and desktop button group with responsive CSS classes", () => {
        render(<LocaleSwitcher />);

        const desktopGroup = screen.getByRole("group", { name: "common.language" });
        expect(desktopGroup).toHaveClass("hidden", "min-[981px]:inline-flex");

        expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getByRole("button", { name: "Español" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Português (Brasil)" })).toBeInTheDocument();

        const mobileCombobox = screen.getByRole("combobox", { name: "common.language" });
        expect(mobileCombobox.closest(".min-\\[981px\\]\\:hidden")).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Português (Brasil)" })).toBeInTheDocument();
    });

    it("persists the locale and replaces the route when desktop button is clicked", async () => {
        mockNavigationState.pathname = "/groceries";
        mockNavigationState.search = "month=2026-04";

        render(<LocaleSwitcher />);

        await userEvent.click(screen.getByRole("button", { name: "Español" }));

        expect(__mockSyncDocumentLocale).toHaveBeenCalledWith("es");
        expect(mockNavigationState.router.replace).toHaveBeenCalledWith(
            "/groceries?month=2026-04",
            { locale: "es" },
        );
    });

    it("persists the locale when the mobile select dropdown changes", async () => {
        mockNavigationState.pathname = "/groceries";
        mockNavigationState.search = "month=2026-04";

        render(<LocaleSwitcher />);

        mockSelectState.onValueChange?.("pt-BR");

        expect(__mockSyncDocumentLocale).toHaveBeenCalledWith("pt-BR");
        expect(mockNavigationState.router.replace).toHaveBeenCalledWith(
            "/groceries?month=2026-04",
            { locale: "pt-BR" },
        );
    });
});