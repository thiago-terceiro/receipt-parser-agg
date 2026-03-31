import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import {
    buildGroceriesMonthPayload,
    getGroceriesStorageKeyByUserId,
    getLegacyGroceriesStorageKeyByEmail,
    getMonthKey,
    isValidMonthKey,
    type GroceryEntry,
} from "@/lib/groceries";
import { parseReceiptItems } from "@/lib/receipt";
import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

const getSessionIdentity = async () => {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id?.trim() || null;
    const email = session?.user?.email?.trim().toLowerCase();

    if (!userId && !email) {
        return null;
    }

    return {
        userId,
        email: email || null,
    };
};

const getRequestedMonth = (request: Request) => {
    const { searchParams } = new URL(request.url);
    const requestedMonth = searchParams.get("month") ?? getMonthKey(new Date());

    return isValidMonthKey(requestedMonth) ? requestedMonth : getMonthKey(new Date());
};

type CreateExpensesPayload = {
    items?: unknown;
    rawResponse?: unknown;
    purchaseDate?: unknown;
    sourceFileName?: unknown;
    modelId?: unknown;
};

export async function POST(request: Request) {
    const identity = await getSessionIdentity();
    if (!identity?.userId) {
        return NextResponse.json({ error: "Sign in to save groceries." }, { status: 401 });
    }

    const data = (await request.json()) as CreateExpensesPayload;
    const parsedItems = Array.isArray(data.items)
        ? data.items
        : typeof data.rawResponse === "string"
            ? parseReceiptItems(data.rawResponse)
            : null;

    if (!parsedItems || parsedItems.length === 0) {
        return NextResponse.json(
            { error: "Request must include at least one grocery item." },
            { status: 400 },
        );
    }

    const purchaseDate =
        typeof data.purchaseDate === "string" && !Number.isNaN(Date.parse(data.purchaseDate))
            ? new Date(data.purchaseDate)
            : new Date();
    const purchaseDateIso = purchaseDate.toISOString();
    const month = getMonthKey(purchaseDate);
    const key = getGroceriesStorageKeyByUserId(identity.userId, month);
    const receiptId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const sourceFileName = typeof data.sourceFileName === "string" ? data.sourceFileName : null;
    const modelId = typeof data.modelId === "string" ? data.modelId : null;

    const entries: GroceryEntry[] = parsedItems.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        receiptId,
        sourceFileName,
        modelId,
        purchaseDate: purchaseDateIso,
        createdAt,
    }));

    await redis.lpush(
        key,
        ...entries.map((entry) => JSON.stringify(entry)),
    );

    return NextResponse.json({ ok: true, month, receiptId, savedCount: entries.length });
}

export async function GET(request: Request) {
    const identity = await getSessionIdentity();
    if (!identity) {
        return NextResponse.json({ error: "Sign in to view groceries." }, { status: 401 });
    }

    const month = getRequestedMonth(request);
    const keysToTry = [
        identity.userId ? getGroceriesStorageKeyByUserId(identity.userId, month) : null,
        identity.email ? getLegacyGroceriesStorageKeyByEmail(identity.email, month) : null,
    ].filter((value): value is string => Boolean(value));

    let entries: GroceryEntry[] = [];
    for (const key of keysToTry) {
        const items = await redis.lrange(key, 0, -1);
        if (items.length === 0) {
            continue;
        }

        entries = items.map((item) => JSON.parse(item as string) as GroceryEntry);
        break;
    }

    return NextResponse.json(buildGroceriesMonthPayload(month, entries));
}