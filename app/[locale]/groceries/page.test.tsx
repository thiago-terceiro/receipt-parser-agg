jest.mock("next-intl/server", () => ({
    getTranslations: jest.fn().mockResolvedValue(jest.fn()),
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

import GroceriesPage from "@/app/[locale]/groceries/page";
import { redirect } from "@/i18n/navigation";
import { BoardRouteError, requireBoardIdentity } from "@/lib/boards-server";
import { loadGroceriesDashboardData } from "@/lib/groceries-server";
import { getSessionIdentity } from "@/lib/session";

describe("GroceriesPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("redirects to the fallback groceries route when the requested board is stale", async () => {
        const redirectSignal = new Error("redirect");
        const redirectMock = redirect as unknown as jest.Mock;

        redirectMock.mockImplementation(() => {
            throw redirectSignal;
        });
        (getSessionIdentity as jest.Mock).mockResolvedValue({
            email: "person@example.com",
            image: null,
            name: "Person",
            userId: "user-123",
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
            GroceriesPage({
                params: Promise.resolve({ locale: "en" }),
                searchParams: Promise.resolve({
                    board: "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d",
                    month: "2026-03",
                }),
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