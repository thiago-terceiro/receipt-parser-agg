/**
 * @jest-environment node
 */

import { DELETE, GET, POST } from "@/app/api/expenses/route";
import { BoardRouteError, requireBoardIdentity } from "@/lib/boards-server";
import {
    deleteSavedReceipt,
    loadGroceriesMonthData,
    persistGroceriesEntries,
} from "@/lib/groceries-server";

jest.mock("@/lib/boards-server", () => {
    const actual = jest.requireActual("@/lib/boards-server");
    return {
        ...actual,
        requireBoardIdentity: jest.fn(),
    };
});

jest.mock("@/lib/groceries-server", () => ({
    deleteSavedReceipt: jest.fn(),
    loadGroceriesMonthData: jest.fn(),
    persistGroceriesEntries: jest.fn(),
}));

const mockRequireBoardIdentity = requireBoardIdentity as jest.MockedFunction<
    typeof requireBoardIdentity
>;
const mockPersistGroceriesEntries =
    persistGroceriesEntries as jest.MockedFunction<
        typeof persistGroceriesEntries
    >;
const mockLoadGroceriesMonthData =
    loadGroceriesMonthData as jest.MockedFunction<
        typeof loadGroceriesMonthData
    >;
const mockDeleteSavedReceipt = deleteSavedReceipt as jest.MockedFunction<
    typeof deleteSavedReceipt
>;

const testIdentity = {
    userId: "user-123",
    email: "user@example.com",
    name: "Test User",
    image: null,
};

const activeBoard = {
    id: "4f6939ce-d5f2-4c08-aecc-a0f0569bb10d",
    name: "Family Groceries",
    ownerUserId: "user-123",
    role: "owner" as const,
    joinedAt: "2026-04-01T00:00:00.000Z",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    archivedAt: null,
};

describe("app/api/expenses/route", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireBoardIdentity.mockResolvedValue(testIdentity);
    });

    describe("POST /api/expenses", () => {
        it("returns 401 when user is not authenticated", async () => {
            mockRequireBoardIdentity.mockRejectedValueOnce(
                new Error("Sign in to save groceries."),
            );

            const request = new Request("http://localhost/api/expenses", {
                method: "POST",
                body: JSON.stringify({}),
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
            await expect(response.json()).resolves.toEqual({
                error: "Sign in to save groceries.",
            });
        });

        it("returns 503 when boards are not configured on the server", async () => {
            mockRequireBoardIdentity.mockRejectedValueOnce(
                new Error("Boards are not configured on the server."),
            );

            const request = new Request("http://localhost/api/expenses", {
                method: "POST",
                body: JSON.stringify({}),
            });

            const response = await POST(request);
            expect(response.status).toBe(503);
        });

        it("returns 400 when body is not valid JSON", async () => {
            const request = new Request("http://localhost/api/expenses", {
                method: "POST",
                body: "invalid-json",
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
            await expect(response.json()).resolves.toEqual({
                error: "Invalid JSON request body.",
            });
        });

        it("returns 400 when items array is empty or missing", async () => {
            const request = new Request("http://localhost/api/expenses", {
                method: "POST",
                body: JSON.stringify({
                    boardId: activeBoard.id,
                    currencyCode: "EUR",
                    items: [],
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
            await expect(response.json()).resolves.toEqual({
                error: "Request must include at least one grocery item.",
            });
        });

        it("returns 400 when currencyCode is invalid", async () => {
            const request = new Request("http://localhost/api/expenses", {
                method: "POST",
                body: JSON.stringify({
                    boardId: activeBoard.id,
                    currencyCode: "INVALID",
                    items: [
                        {
                            item: "Organic Milk",
                            normalizedItem: "organic milk",
                            category: "dairy",
                            quantity: 2,
                            unitPrice: 1.5,
                            lineTotal: 3.0,
                        },
                    ],
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
            await expect(response.json()).resolves.toEqual({
                error: "Request must include a valid 3-letter ISO 4217 currency code.",
            });
        });

        it("persists grocery entries with a shared receiptId and returns 200", async () => {
            mockPersistGroceriesEntries.mockResolvedValueOnce({
                activeBoard,
                savedCount: 1,
            });

            const request = new Request("http://localhost/api/expenses", {
                method: "POST",
                body: JSON.stringify({
                    boardId: activeBoard.id,
                    currencyCode: "EUR",
                    purchaseDate: "2026-04-15T12:00:00.000Z",
                    sourceFileName: "receipt.jpg",
                    modelId: "Qwen/Qwen2.5-VL-72B-Instruct",
                    items: [
                        {
                            item: "Organic Milk",
                            normalizedItem: "organic milk",
                            category: "dairy",
                            quantity: 2,
                            unitPrice: 1.5,
                            lineTotal: 3.0,
                        },
                    ],
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(200);
            const body = await response.json();

            expect(body).toMatchObject({
                ok: true,
                boardId: activeBoard.id,
                month: "2026-04",
                savedCount: 1,
            });
            expect(typeof body.receiptId).toBe("string");

            expect(mockPersistGroceriesEntries).toHaveBeenCalledWith(
                testIdentity,
                activeBoard.id,
                expect.arrayContaining([
                    expect.objectContaining({
                        receiptId: body.receiptId,
                        currencyCode: "EUR",
                        item: "Organic Milk",
                        sourceFileName: "receipt.jpg",
                    }),
                ]),
            );
        });

        it("prioritizes explicit data.currencyCode over rawResponse extraction currency", async () => {
            mockPersistGroceriesEntries.mockResolvedValueOnce({
                activeBoard,
                savedCount: 1,
            });

            const request = new Request("http://localhost/api/expenses", {
                method: "POST",
                body: JSON.stringify({
                    boardId: activeBoard.id,
                    currencyCode: "BRL",
                    rawResponse: JSON.stringify({
                        currencyCode: "USD",
                        items: [
                            {
                                item: "Coffee",
                                normalizedItem: "coffee",
                                category: "beverages",
                                quantity: 1,
                                unitPrice: 10,
                                lineTotal: 10,
                            },
                        ],
                    }),
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(200);

            expect(mockPersistGroceriesEntries).toHaveBeenCalledWith(
                testIdentity,
                activeBoard.id,
                expect.arrayContaining([
                    expect.objectContaining({
                        currencyCode: "BRL",
                    }),
                ]),
            );
        });

        it("propagates BoardRouteError status codes (e.g. 409 currency conflict)", async () => {
            mockPersistGroceriesEntries.mockRejectedValueOnce(
                new BoardRouteError(
                    "This board already has groceries for 2026-04 in USD.",
                    409,
                ),
            );

            const request = new Request("http://localhost/api/expenses", {
                method: "POST",
                body: JSON.stringify({
                    boardId: activeBoard.id,
                    currencyCode: "EUR",
                    items: [
                        {
                            item: "Apples",
                            normalizedItem: "apples",
                            category: "produce",
                            quantity: 1,
                            unitPrice: 2.5,
                            lineTotal: 2.5,
                        },
                    ],
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(409);
            await expect(response.json()).resolves.toEqual({
                error: "This board already has groceries for 2026-04 in USD.",
            });
        });

        it("returns 400 when body is not valid JSON", async () => {
            const request = new Request("http://localhost/api/expenses", {
                method: "POST",
                body: "invalid-json",
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
            await expect(response.json()).resolves.toEqual({
                error: "Invalid JSON request body.",
            });
        });

        it("returns 400 when body is JSON null or not an object", async () => {
            const request = new Request("http://localhost/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "null",
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
            await expect(response.json()).resolves.toEqual({
                error: "Invalid JSON request body.",
            });
        });
    });

    describe("GET /api/expenses", () => {
        it("loads month entries and extracted receipts and returns aggregated payload", async () => {
            mockLoadGroceriesMonthData.mockResolvedValueOnce({
                entries: [
                    {
                        id: "entry-1",
                        receiptId: "receipt-1",
                        currencyCode: "EUR",
                        item: "Apples",
                        normalizedItem: "apples",
                        category: "produce",
                        quantity: 2,
                        unitPrice: 1.5,
                        lineTotal: 3.0,
                        sourceFileName: "market.png",
                        modelId: "test-model",
                        purchaseDate: "2026-04-10T10:00:00.000Z",
                        createdAt: "2026-04-10T10:00:00.000Z",
                    },
                ],
                extractedReceipts: [
                    {
                        id: "receipt-1",
                        month: "2026-04",
                        currencyCode: "EUR",
                        sourceFileName: "market.png",
                        modelId: "test-model",
                        extractedAt: "2026-04-10T10:00:00.000Z",
                        itemCount: 1,
                        total: 3.0,
                        categories: ["produce"],
                        items: [
                            {
                                item: "Apples",
                                normalizedItem: "apples",
                                category: "produce",
                                quantity: 2,
                                unitPrice: 1.5,
                                lineTotal: 3.0,
                            },
                        ],
                    },
                ],
            });

            const request = new Request(
                `http://localhost/api/expenses?month=2026-04&boardId=${activeBoard.id}`,
            );
            const response = await GET(request);

            expect(response.status).toBe(200);
            const payload = await response.json();
            expect(payload.month).toBe("2026-04");
            expect(payload.currencyCode).toBe("EUR");
            expect(payload.summary.total).toBe(3.0);
            expect(payload.extractedReceipts).toHaveLength(1);
            expect(payload.extractedReceipts[0].id).toBe("receipt-1");
        });
    });

    describe("DELETE /api/expenses", () => {
        it("deletes a saved receipt and returns deletedEntriesCount", async () => {
            const receiptId = "b84c0486-99e1-49d0-9479-5926410b4c1a";
            mockDeleteSavedReceipt.mockResolvedValueOnce({
                board: {
                    id: activeBoard.id,
                    name: activeBoard.name,
                    owner_user_id: activeBoard.ownerUserId,
                    created_at: activeBoard.createdAt,
                    updated_at: activeBoard.updatedAt,
                    archived_at: null,
                },
                deletedEntriesCount: 3,
            });

            const request = new Request("http://localhost/api/expenses", {
                method: "DELETE",
                body: JSON.stringify({
                    boardId: activeBoard.id,
                    receiptId,
                }),
            });

            const response = await DELETE(request);
            expect(response.status).toBe(200);
            await expect(response.json()).resolves.toEqual({
                ok: true,
                boardId: activeBoard.id,
                deletedEntriesCount: 3,
                receiptId,
            });
        });

        it("returns 404 when receipt does not exist", async () => {
            mockDeleteSavedReceipt.mockRejectedValueOnce(
                new BoardRouteError("Receipt not found.", 404),
            );

            const request = new Request("http://localhost/api/expenses", {
                method: "DELETE",
                body: JSON.stringify({
                    boardId: activeBoard.id,
                    receiptId: "b84c0486-99e1-49d0-9479-5926410b4c1a",
                }),
            });

            const response = await DELETE(request);
            expect(response.status).toBe(404);
            await expect(response.json()).resolves.toEqual({
                error: "Receipt not found.",
            });
        });

        it("returns 400 when body is not valid JSON", async () => {
            const request = new Request("http://localhost/api/expenses", {
                method: "DELETE",
                body: "invalid-json",
            });

            const response = await DELETE(request);
            expect(response.status).toBe(400);
            await expect(response.json()).resolves.toEqual({
                error: "Invalid JSON request body.",
            });
        });

        it("returns 400 when body is JSON null or not an object", async () => {
            const request = new Request("http://localhost/api/expenses", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: "null",
            });

            const response = await DELETE(request);
            expect(response.status).toBe(400);
            await expect(response.json()).resolves.toEqual({
                error: "Invalid JSON request body.",
            });
        });
    });
});
