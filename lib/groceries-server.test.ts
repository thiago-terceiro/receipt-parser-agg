/**
 * @jest-environment node
 */

import {
    BoardRouteError,
    requireBoardAccess,
    resolveActiveBoardForIdentity,
} from "@/lib/boards-server";
import type { GroceryEntry } from "@/lib/groceries";
import {
    deleteSavedReceipt,
    getGroceriesWriteKey,
    getLegacyStorageKeyByEmail,
    getReceiptExtractionWriteKey,
    getStorageKeyByUserId,
    normalizeStorageToken,
    persistExtractedReceipt,
    persistGroceriesEntries,
} from "@/lib/groceries-server";

jest.mock("@/lib/boards-server", () => {
    const actual = jest.requireActual("@/lib/boards-server");
    return {
        ...actual,
        listBoardMembersForResolvedBoard: jest.fn().mockResolvedValue([]),
        requireBoardAccess: jest.fn(),
        resolveActiveBoardForIdentity: jest.fn(),
    };
});

jest.mock("@/lib/supabase-server", () => ({
    hasSupabaseServerConfig: true,
    getSupabaseServerClient: jest.fn(),
}));

const mockResolveActiveBoard =
    resolveActiveBoardForIdentity as jest.MockedFunction<
        typeof resolveActiveBoardForIdentity
    >;
const mockRequireBoardAccess = requireBoardAccess as jest.MockedFunction<
    typeof requireBoardAccess
>;

const testIdentity = {
    userId: "user-123",
    email: "user@example.com",
    name: "Test User",
    image: null,
};

const activeBoardSummary = {
    id: "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d",
    name: "Main Board",
    ownerUserId: "user-123",
    role: "owner" as const,
    joinedAt: "2026-04-01T00:00:00.000Z",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    archivedAt: null,
};

const boardRecord = {
    id: activeBoardSummary.id,
    name: activeBoardSummary.name,
    owner_user_id: activeBoardSummary.ownerUserId,
    created_at: activeBoardSummary.createdAt,
    updated_at: activeBoardSummary.updatedAt,
    archived_at: null,
};

const sampleEntries: GroceryEntry[] = [
    {
        id: "11111111-1111-4111-8111-111111111111",
        receiptId: "22222222-2222-4222-8222-222222222222",
        currencyCode: "EUR",
        item: "Sourdough Bread",
        normalizedItem: "sourdough bread",
        category: "bakery",
        quantity: 1,
        unitPrice: 4.5,
        lineTotal: 4.5,
        sourceFileName: "bakery.jpg",
        modelId: "Qwen/Qwen2.5-VL-72B-Instruct",
        purchaseDate: "2026-04-15T10:00:00.000Z",
        createdAt: "2026-04-15T10:00:00.000Z",
    },
];

describe("lib/groceries-server", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveActiveBoard.mockResolvedValue({
            activeBoard: activeBoardSummary,
            boards: [activeBoardSummary],
        });
    });

    describe("storage key helpers", () => {
        it("normalizes storage tokens and constructs user and email keys", () => {
            expect(normalizeStorageToken("  User@Example.COM ")).toBe(
                "user@example.com",
            );
            expect(
                getStorageKeyByUserId("groceries", "User-1", "2026-04"),
            ).toBe("groceries:uid:user-1:2026-04");
            expect(
                getLegacyStorageKeyByEmail(
                    "receipt-extractions",
                    "Test@Example.com",
                    "2026-04",
                ),
            ).toBe("receipt-extractions:test@example.com:2026-04");
            expect(getGroceriesWriteKey(testIdentity, "2026-04")).toBe(
                "groceries:uid:user-123:2026-04",
            );
            expect(getReceiptExtractionWriteKey(testIdentity, "2026-04")).toBe(
                "receipt-extractions:uid:user-123:2026-04",
            );
            expect(getGroceriesWriteKey(null, "2026-04")).toBeNull();
        });
    });

    describe("persistGroceriesEntries", () => {
        it("synchronizes both grocery_entries and extracted_receipts with the same receiptId", async () => {
            const mockGroceryInsert = jest
                .fn()
                .mockResolvedValue({ error: null });
            const mockReceiptInsert = jest
                .fn()
                .mockResolvedValue({ error: null });

            const mockClient = {
                from: jest.fn((table: string) => {
                    if (table === "grocery_entries") {
                        return {
                            select: jest.fn(() => ({
                                eq: jest.fn(() => ({
                                    gte: jest.fn(() => ({
                                        lt: jest.fn().mockResolvedValue({
                                            data: [{ currency_code: "EUR" }],
                                            error: null,
                                        }),
                                    })),
                                })),
                            })),
                            insert: mockGroceryInsert,
                        };
                    }
                    if (table === "extracted_receipts") {
                        return {
                            insert: mockReceiptInsert,
                        };
                    }
                    throw new Error(`Unexpected table ${table}`);
                }),
            };

            mockRequireBoardAccess.mockResolvedValueOnce({
                board: boardRecord,
                client: mockClient as never,
                membership: {
                    id: "member-1",
                    board_id: boardRecord.id,
                    user_id: testIdentity.userId,
                    role: "owner",
                    status: "active",
                    joined_at: boardRecord.created_at,
                    created_at: boardRecord.created_at,
                    updated_at: boardRecord.updated_at,
                },
            });

            const result = await persistGroceriesEntries(
                testIdentity,
                activeBoardSummary.id,
                sampleEntries,
            );

            expect(result).toEqual({
                activeBoard: activeBoardSummary,
                savedCount: 1,
            });
            expect(mockGroceryInsert).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: sampleEntries[0].id,
                    board_id: activeBoardSummary.id,
                    receipt_id: sampleEntries[0].receiptId,
                    currency_code: "EUR",
                }),
            ]);
            expect(mockReceiptInsert).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: sampleEntries[0].receiptId,
                    board_id: activeBoardSummary.id,
                    month: "2026-04",
                    currency_code: "EUR",
                    item_count: 1,
                    total: 4.5,
                    categories: ["bakery"],
                }),
            ]);
        });

        it("rolls back grocery_entries if extracted_receipts insert fails", async () => {
            const mockGroceryInsert = jest
                .fn()
                .mockResolvedValue({ error: null });
            const mockGroceryRollbackIn = jest
                .fn()
                .mockResolvedValue({ error: null });
            const mockReceiptInsert = jest.fn().mockResolvedValue({
                error: { message: "Receipt table constraint failed" },
            });

            const mockClient = {
                from: jest.fn((table: string) => {
                    if (table === "grocery_entries") {
                        return {
                            select: jest.fn(() => ({
                                eq: jest.fn(() => ({
                                    gte: jest.fn(() => ({
                                        lt: jest.fn().mockResolvedValue({
                                            data: [],
                                            error: null,
                                        }),
                                    })),
                                })),
                            })),
                            insert: mockGroceryInsert,
                            delete: jest.fn(() => ({
                                eq: jest.fn(() => ({
                                    in: mockGroceryRollbackIn,
                                })),
                            })),
                        };
                    }
                    if (table === "extracted_receipts") {
                        return {
                            insert: mockReceiptInsert,
                        };
                    }
                    throw new Error(`Unexpected table ${table}`);
                }),
            };

            mockRequireBoardAccess.mockResolvedValueOnce({
                board: boardRecord,
                client: mockClient as never,
                membership: {
                    id: "member-1",
                    board_id: boardRecord.id,
                    user_id: testIdentity.userId,
                    role: "owner",
                    status: "active",
                    joined_at: boardRecord.created_at,
                    created_at: boardRecord.created_at,
                    updated_at: boardRecord.updated_at,
                },
            });

            await expect(
                persistGroceriesEntries(
                    testIdentity,
                    activeBoardSummary.id,
                    sampleEntries,
                ),
            ).rejects.toThrow("Receipt table constraint failed");

            expect(mockGroceryRollbackIn).toHaveBeenCalledWith("receipt_id", [
                sampleEntries[0].receiptId,
            ]);
        });

        it("throws 409 BoardRouteError when currency conflicts with existing month entries", async () => {
            const mockClient = {
                from: jest.fn(() => ({
                    select: jest.fn(() => ({
                        eq: jest.fn(() => ({
                            gte: jest.fn(() => ({
                                lt: jest.fn().mockResolvedValue({
                                    data: [{ currency_code: "USD" }],
                                    error: null,
                                }),
                            })),
                        })),
                    })),
                })),
            };

            mockRequireBoardAccess.mockResolvedValueOnce({
                board: boardRecord,
                client: mockClient as never,
                membership: {
                    id: "member-1",
                    board_id: boardRecord.id,
                    user_id: testIdentity.userId,
                    role: "owner",
                    status: "active",
                    joined_at: boardRecord.created_at,
                    created_at: boardRecord.created_at,
                    updated_at: boardRecord.updated_at,
                },
            });

            await expect(
                persistGroceriesEntries(
                    testIdentity,
                    activeBoardSummary.id,
                    sampleEntries,
                ),
            ).rejects.toThrow(BoardRouteError);
        });
    });

    describe("persistExtractedReceipt & deleteSavedReceipt", () => {
        it("persists an extracted receipt directly", async () => {
            const mockReceiptInsert = jest
                .fn()
                .mockResolvedValue({ error: null });
            const mockClient = {
                from: jest.fn(() => ({
                    insert: mockReceiptInsert,
                })),
            };

            mockRequireBoardAccess.mockResolvedValueOnce({
                board: boardRecord,
                client: mockClient as never,
                membership: {
                    id: "member-1",
                    board_id: boardRecord.id,
                    user_id: testIdentity.userId,
                    role: "owner",
                    status: "active",
                    joined_at: boardRecord.created_at,
                    created_at: boardRecord.created_at,
                    updated_at: boardRecord.updated_at,
                },
            });

            const res = await persistExtractedReceipt(
                testIdentity,
                activeBoardSummary.id,
                {
                    id: sampleEntries[0].receiptId,
                    month: "2026-04",
                    currencyCode: "EUR",
                    sourceFileName: "bakery.jpg",
                    modelId: "test-model",
                    extractedAt: "2026-04-15T10:00:00.000Z",
                    itemCount: 1,
                    total: 4.5,
                    categories: ["bakery"],
                    items: [],
                },
            );

            expect(res.activeBoard.id).toBe(activeBoardSummary.id);
            expect(mockReceiptInsert).toHaveBeenCalledTimes(1);
        });

        it("deletes matching rows from both grocery_entries and extracted_receipts", async () => {
            const receiptId = sampleEntries[0].receiptId;
            const mockClient = {
                from: jest.fn((table: string) => ({
                    delete: jest.fn(() => ({
                        eq: jest.fn(() => ({
                            eq: jest.fn(() => ({
                                select: jest.fn().mockResolvedValue({
                                    data:
                                        table === "grocery_entries"
                                            ? [{ id: "e1" }, { id: "e2" }]
                                            : [{ id: receiptId }],
                                    error: null,
                                }),
                            })),
                        })),
                    })),
                })),
            };

            mockRequireBoardAccess.mockResolvedValueOnce({
                board: boardRecord,
                client: mockClient as never,
                membership: {
                    id: "member-1",
                    board_id: boardRecord.id,
                    user_id: testIdentity.userId,
                    role: "owner",
                    status: "active",
                    joined_at: boardRecord.created_at,
                    created_at: boardRecord.created_at,
                    updated_at: boardRecord.updated_at,
                },
            });

            const result = await deleteSavedReceipt(
                testIdentity,
                activeBoardSummary.id,
                receiptId,
            );

            expect(result).toEqual({
                board: boardRecord,
                deletedEntriesCount: 2,
            });
        });

        it("throws 400 BoardRouteError when receiptId is not a valid UUID", async () => {
            await expect(
                deleteSavedReceipt(
                    testIdentity,
                    activeBoardSummary.id,
                    "not-a-uuid",
                ),
            ).rejects.toThrow("Receipt id is invalid.");
        });
    });
});
