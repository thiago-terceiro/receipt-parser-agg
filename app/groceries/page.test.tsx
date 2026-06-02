jest.mock("@/app/localized-redirect", () => ({
    getPreferredLocale: jest.fn(),
}));

import GroceriesPage from "@/app/groceries/page";
import { redirect } from "@/i18n/navigation";
import { getPreferredLocale } from "@/app/localized-redirect";

describe("GroceriesPage redirect wrapper", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("preserves board-related query params when redirecting to the localized route", async () => {
        const redirectSignal = new Error("redirect");
        const redirectMock = redirect as unknown as jest.Mock;

        (getPreferredLocale as jest.Mock).mockResolvedValue("pt-BR");
        redirectMock.mockImplementation(() => {
            throw redirectSignal;
        });

        await expect(
            GroceriesPage({
                searchParams: Promise.resolve({
                    board: "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d",
                    month: "2026-03",
                    saved: "saved-1",
                }),
            }),
        ).rejects.toBe(redirectSignal);

        expect(redirectMock).toHaveBeenCalledWith({
            href: {
                pathname: "/groceries",
                query: {
                    board: "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d",
                    month: "2026-03",
                    saved: "saved-1",
                },
            },
            locale: "pt-BR",
        });
    });
});