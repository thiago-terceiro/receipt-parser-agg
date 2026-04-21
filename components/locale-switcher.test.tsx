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
    SelectContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
    SelectItem: ({ children, value }: MockSelectItemProps) => (
        <option value={value}>{children}</option>
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

    const setViewportWidth = (width: number) => {
        window.matchMedia = jest.fn().mockImplementation((query: string) => ({
            matches: query === "(max-width: 980px)" ? width <= 980 : false,
            media: query,
            onchange: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }));
    };

    beforeEach(() => {
        __mockSyncDocumentLocale.mockClear();
        mockSelectState.onValueChange = undefined;
        mockSelectState.value = "";
    });

    it("renders a button for each app locale", () => {
        setViewportWidth(1200);

        render(<LocaleSwitcher />);

        expect(screen.getByRole("button", { name: "locales.en" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getByRole("button", { name: "locales.es" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "locales.pt-BR" })).toBeInTheDocument();
    });

    it("renders a locale dropdown at 980px and below", () => {
        setViewportWidth(980);

        render(<LocaleSwitcher />);

        expect(screen.getByRole("combobox", { name: "common.language" })).toBeInTheDocument();
        expect(screen.queryByRole("group", { name: "common.language" })).not.toBeInTheDocument();
    });

    it("persists the locale and replaces the route", async () => {
        setViewportWidth(1200);
        mockNavigationState.pathname = "/groceries";
        mockNavigationState.search = "month=2026-04";

        render(<LocaleSwitcher />);

        await userEvent.click(screen.getByRole("button", { name: "locales.es" }));

        expect(__mockSyncDocumentLocale).toHaveBeenCalledWith("es");
        expect(mockNavigationState.router.replace).toHaveBeenCalledWith(
            "/groceries?month=2026-04",
            { locale: "es" },
        );
    });

    it("persists the locale when the compact dropdown changes", async () => {
        setViewportWidth(980);
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