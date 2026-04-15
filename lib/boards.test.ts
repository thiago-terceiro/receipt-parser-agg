import {
    isBoardRole,
    isValidBoardId,
    normalizeBoardName,
    normalizeInviteEmail,
} from "@/lib/boards";

describe("board helpers", () => {
    test("normalizes board names", () => {
        expect(normalizeBoardName("  Weekend   groceries  ")).toBe(
            "Weekend groceries",
        );
    });

    test("rejects invalid board names", () => {
        expect(normalizeBoardName("   ")).toBeNull();
        expect(normalizeBoardName("x".repeat(81))).toBeNull();
    });

    test("normalizes invite email addresses", () => {
        expect(normalizeInviteEmail("  USER@Example.com ")).toBe(
            "user@example.com",
        );
    });

    test("rejects invalid invite email addresses", () => {
        expect(normalizeInviteEmail("not-an-email")).toBeNull();
    });

    test("recognizes supported board roles", () => {
        expect(isBoardRole("owner")).toBe(true);
        expect(isBoardRole("editor")).toBe(true);
        expect(isBoardRole("viewer")).toBe(false);
    });

    test("validates board ids as UUIDs", () => {
        expect(isValidBoardId("4f6939ce-d5f2-4c08-aecc-a0f0569bb10d")).toBe(true);
        expect(isValidBoardId("not-a-uuid")).toBe(false);
    });
});