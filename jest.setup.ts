import "@testing-library/jest-dom";
import React from "react";

import {
    mockAuthState,
    mockIntlState,
    mockNavigationState,
    resetMockState,
} from "@/test/mock-state";

jest.mock("next-intl", () => {
    return {
        NextIntlClientProvider: ({ children }: { children: unknown }) => children,
        useLocale: () => mockIntlState.locale,
        useTranslations: () => mockIntlState.translate,
    };
});

jest.mock("next/navigation", () => {
    return {
        usePathname: () => mockNavigationState.pathname,
        useRouter: () => mockNavigationState.router,
        useSearchParams: () => new URLSearchParams(mockNavigationState.search),
    };
});

jest.mock("next-auth/react", () => {
    return {
        SessionProvider: ({ children }: { children: unknown }) => children,
        signIn: (...args: unknown[]) => mockAuthState.signIn(...args),
        signOut: (...args: unknown[]) => mockAuthState.signOut(...args),
        useSession: () => ({
            data: mockAuthState.session,
            status: mockAuthState.status,
        }),
    };
});

jest.mock("next/link", () => {
    return {
        __esModule: true,
        default: ({
            children,
            href,
            ...props
        }: {
            children: React.ReactNode;
            href: string;
        }) =>
            React.createElement("a", { href, ...props }, children),
    };
});

jest.mock("motion/react", () => ({
    AnimatePresence: ({ children }: { children: unknown }) => children,
    LayoutGroup: ({ children }: { children: unknown }) => children,
    motion: new Proxy(
        {},
        {
            get: (_, tag: string) => {
                return ({
                    animate: _animate,
                    exit: _exit,
                    initial: _initial,
                    layout: _layout,
                    transition: _transition,
                    ...props
                }: Record<string, unknown>) => React.createElement(tag, props);
            },
        },
    ),
}));

beforeEach(() => {
    resetMockState();

    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query: string) => ({
            matches: query.includes("dark") ? false : false,
            media: query,
            onchange: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });

    Object.defineProperty(window, "localStorage", {
        writable: true,
        value: {
            clear: jest.fn(),
            getItem: jest.fn(() => null),
            key: jest.fn(),
            length: 0,
            removeItem: jest.fn(),
            setItem: jest.fn(),
        },
    });

    Object.defineProperty(window.URL, "createObjectURL", {
        writable: true,
        value: jest.fn(() => "blob:preview-url"),
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
        writable: true,
        value: jest.fn(),
    });

    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
        writable: true,
        value: jest.fn(),
    });

    global.ResizeObserver = class ResizeObserver {
        observe() { }
        unobserve() { }
        disconnect() { }
    };
});