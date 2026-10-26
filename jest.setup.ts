import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";
import React from "react";

expect.extend(toHaveNoViolations);

if (typeof global.Request === "undefined" && typeof globalThis.Request !== "undefined") {
    global.Request = globalThis.Request;
}
if (typeof global.Response === "undefined" && typeof globalThis.Response !== "undefined") {
    global.Response = globalThis.Response;
}
if (typeof global.Headers === "undefined" && typeof globalThis.Headers !== "undefined") {
    global.Headers = globalThis.Headers;
}

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

jest.mock("@/i18n/navigation", () => {
    const { getLocaleSegment } = jest.requireActual("@/lib/i18n/config");

    const buildHref = (
        locale: string,
        href:
            | string
            | {
                pathname: string;
                query?: Record<string, string | number | boolean | undefined>;
            },
    ) => {
        const pathname = typeof href === "string" ? href : href.pathname;
        const query = typeof href === "string" ? undefined : href.query;
        const searchParams = new URLSearchParams();

        Object.entries(query ?? {}).forEach(([key, value]) => {
            if (value != null) {
                searchParams.set(key, String(value));
            }
        });

        const prefix = `/${getLocaleSegment(locale as never)}`;
        const localizedPath = pathname === "/" ? prefix : `${prefix}${pathname}`;
        const search = searchParams.toString();

        return search ? `${localizedPath}?${search}` : localizedPath;
    };

    return {
        Link: ({
            children,
            href,
            locale,
            ...props
        }: {
            children: React.ReactNode;
            href:
            | string
            | {
                pathname: string;
                query?: Record<string, string | number | boolean | undefined>;
            };
            locale?: string;
        }) =>
            React.createElement(
                "a",
                { href: buildHref(locale ?? mockIntlState.locale, href), ...props },
                children,
            ),
        getPathname: ({
            locale,
            href,
        }: {
            locale: string;
            href:
            | string
            | {
                pathname: string;
                query?: Record<string, string | number | boolean | undefined>;
            };
        }) => buildHref(locale, href),
        redirect: jest.fn(),
        usePathname: () => mockNavigationState.pathname,
        useRouter: () => mockNavigationState.router,
    };
});

jest.mock("next/navigation", () => {
    return {
        usePathname: () => mockNavigationState.pathname,
        useRouter: () => mockNavigationState.router,
        useSearchParams: () => new URLSearchParams(mockNavigationState.search),
        redirect: jest.fn(),
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

    if (typeof window !== "undefined") {
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

        Object.defineProperty(window, "sessionStorage", {
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
    }

    global.ResizeObserver = class ResizeObserver {
        observe() { }
        unobserve() { }
        disconnect() { }
    };
});