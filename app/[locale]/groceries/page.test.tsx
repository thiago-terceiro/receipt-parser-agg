jest.mock("next-intl/server", () => ({
    getTranslations: jest.fn().mockResolvedValue(jest.fn((key: string) => `groceries.${key}`)),
    setRequestLocale: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
    getSessionIdentity: jest.fn(),
}));

jest.mock("@/lib/boards-server", () => {
    class MockBoardRouteError extends Error {
        readonly statusCode: number;

        constructor(message: string, statusCode = 400) {
            super(message);
            this.name = "BoardRouteError";
            this.statusCode = statusCode;
        }
    }

    return {
        BoardRouteError: MockBoardRouteError,
        requireBoardIdentity: jest.fn(),
    };
});

jest.mock("@/lib/groceries-server", () => ({
    loadGroceriesDashboardData: jest.fn(),
}));

jest.mock("@/lib/i18n/config", () => ({
    getLocaleFromSegment: jest.fn((locale: string) => locale),
}));

import { Children, isValidElement, Suspense, type ReactNode } from "react";

import { GroceriesDashboardContent } from "@/app/[locale]/groceries/GroceriesDashboardContent";
import { GroceriesSignInCard } from "@/app/[locale]/groceries/GroceriesSignInCard";
import GroceriesPage from "@/app/[locale]/groceries/page";
import { redirect } from "@/i18n/navigation";
import { BoardRouteError, requireBoardIdentity } from "@/lib/boards-server";
import { loadGroceriesDashboardData } from "@/lib/groceries-server";
import { getSessionIdentity } from "@/lib/session";

const findSuspenseElement = (node: ReactNode): boolean => {
    for (const child of Children.toArray(node)) {
        if (!isValidElement<{ children?: ReactNode }>(child)) {
            continue;
        }
        if (child.type === Suspense) {
            return true;
        }
        if (child.props.children && findSuspenseElement(child.props.children)) {
            return true;
        }
    }
    return false;
};

describe("GroceriesPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders GroceriesSignInCard immediately when unauthenticated", async () => {
        (getSessionIdentity as jest.Mock).mockResolvedValue(null);

        const element = await GroceriesPage({
            params: Promise.resolve({ locale: "en" }),
        });

        expect(element.type).toBe(GroceriesSignInCard);
        expect(loadGroceriesDashboardData).not.toHaveBeenCalled();
    });

    it("renders static shell above a streaming Suspense boundary without blocking on loadGroceriesDashboardData", async () => {
        (getSessionIdentity as jest.Mock).mockResolvedValue({
            email: "person@example.com",
            image: null,
            name: "Person",
            userId: "user-123",
        });

        const element = await GroceriesPage({
            params: Promise.resolve({ locale: "en" }),
            searchParams: Promise.resolve({ month: "2026-03" }),
        });

        expect(findSuspenseElement(element)).toBe(true);
        expect(loadGroceriesDashboardData).not.toHaveBeenCalled();
    });

    it("redirects to the fallback groceries route when the requested board is stale", async () => {
        const redirectSignal = new Error("redirect");
        const redirectMock = redirect as unknown as jest.Mock;

        redirectMock.mockImplementation(() => {
            throw redirectSignal;
        });
        (requireBoardIdentity as jest.Mock).mockResolvedValue({
            email: "person@example.com",
            image: null,
            name: "Person",
            userId: "user-123",
        });
        (loadGroceriesDashboardData as jest.Mock).mockRejectedValue(
            new BoardRouteError("You do not have access to that board.", 403),
        );

        await expect(
            GroceriesDashboardContent({
                currentMonth: "2026-11",
                locale: "en",
                month: "2026-03",
                requestedBoardId: "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d",
            }),
        ).rejects.toBe(redirectSignal);

        expect(loadGroceriesDashboardData).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "user-123" }),
            "2026-03",
            "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d",
        );
        expect(redirectMock).toHaveBeenCalledWith({
            href: {
                pathname: "/groceries",
                query: { month: "2026-03" },
            },
            locale: "en",
        });
    });
});