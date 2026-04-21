
import type { AppLocale } from "@/lib/i18n/config";
import { createMessagesObject } from "@/lib/i18n/messages";

import type { Session } from "next-auth";

const translate = (
    key: string,
    values?: Record<string, string | number | boolean | null | undefined>,
) => {
    if (!values || Object.keys(values).length === 0) {
        return key;
    }

    return `${key} ${JSON.stringify(values)}`;
};

export const createTestTranslations = (locale: AppLocale = "en") => {
    return createMessagesObject(translate, locale);
};

export const mockIntlState = {
    locale: "en" as AppLocale,
    translate,
};

export const mockNavigationState = {
    pathname: "/",
    router: {
        push: jest.fn(),
        replace: jest.fn(),
        refresh: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        prefetch: jest.fn(),
    },
    search: "",
};

export const mockAuthState = {
    session: null as Session | null,
    signIn: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
    status: "unauthenticated" as "authenticated" | "loading" | "unauthenticated",
};

export const resetMockState = () => {
    mockIntlState.locale = "en";
    mockNavigationState.pathname = "/";
    mockNavigationState.search = "";
    Object.values(mockNavigationState.router).forEach((mock) => mock.mockReset());
    mockAuthState.session = null;
    mockAuthState.status = "unauthenticated";
    mockAuthState.signIn.mockReset().mockResolvedValue(undefined);
    mockAuthState.signOut.mockReset().mockResolvedValue(undefined);
};