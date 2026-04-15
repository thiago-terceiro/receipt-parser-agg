import {
    type ActiveBoardSelection,
    requireBoardAccess,
    resolveActiveBoardForIdentity,
} from "@/lib/boards-server";
import {
    type ExtractedReceipt,
    getMonthRange,
    type GroceryEntry,
} from "@/lib/groceries";
import { redis } from "@/lib/redis";
import type { SessionIdentity } from "@/lib/session";
import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase-server";

export const normalizeStorageToken = (value: string) => value.trim().toLowerCase();

type StorageNamespace = "groceries" | "receipt-extractions";

export const getStorageKeyByUserId = (
    namespace: StorageNamespace,
    userId: string,
    month: string,
) => {
    return `${namespace}:uid:${normalizeStorageToken(userId)}:${month}`;
};

export const getLegacyStorageKeyByEmail = (
    namespace: StorageNamespace,
    email: string,
    month: string,
) => {
    return `${namespace}:${normalizeStorageToken(email)}:${month}`;
};

const buildLookupKeys = (
    identity: SessionIdentity | null,
    namespace: StorageNamespace,
    month: string,
) => {
    if (!identity) {
        return [];
    }

    return [
        identity.userId ? getStorageKeyByUserId(namespace, identity.userId, month) : null,
        identity.email ? getLegacyStorageKeyByEmail(namespace, identity.email, month) : null,
    ].filter((value): value is string => Boolean(value));
};

const resolveWriteKey = (
    identity: SessionIdentity | null,
    namespace: StorageNamespace,
    month: string,
) => {
    if (!identity) {
        return null;
    }

    if (identity.userId) {
        return getStorageKeyByUserId(namespace, identity.userId, month);
    }

    if (identity.email) {
        return getLegacyStorageKeyByEmail(namespace, identity.email, month);
    }

    return null;
};

const parseRedisList = <T>(items: unknown[], key: string) => {
    const parsedItems: T[] = [];

    for (const item of items) {
        try {
            parsedItems.push(JSON.parse(item as string) as T);
        } catch (error) {
            console.warn(
                `Skipping malformed Redis entry from ${key}.`,
                error,
            );
        }
    }

    return parsedItems;
};

const loadFirstMatchingRedisList = async <T>(keysToTry: string[]) => {
    if (!redis) {
        return [] as T[];
    }

    for (const key of keysToTry) {
        const items = await redis.lrange(key, 0, -1);
        if (items.length === 0) {
            continue;
        }

        return parseRedisList<T>(items, key);
    }

    return [] as T[];
};

const loadStorageEntries = async <T>(
    namespace: StorageNamespace,
    identity: SessionIdentity | null,
    month: string,
) => {
    return loadFirstMatchingRedisList<T>(buildLookupKeys(identity, namespace, month));
};

export const loadGroceriesEntries = async (
    identity: SessionIdentity | null,
    month: string,
    requestedBoardId?: unknown,
) => {
    if (hasSupabaseServerConfig && identity?.userId) {
        return loadSupabaseGroceriesEntries(identity, month, requestedBoardId);
    }

    return loadStorageEntries<GroceryEntry>("groceries", identity, month);
};

export const loadExtractedReceipts = async (
    identity: SessionIdentity | null,
    month: string,
    requestedBoardId?: unknown,
) => {
    if (hasSupabaseServerConfig && identity?.userId) {
        return loadSupabaseExtractedReceipts(identity, month, requestedBoardId);
    }

    return loadStorageEntries<ExtractedReceipt>("receipt-extractions", identity, month);
};

export const loadGroceriesMonthData = async (
    identity: SessionIdentity | null,
    month: string,
    requestedBoardId?: unknown,
) => {
    const [entries, extractedReceipts] = await Promise.all([
        loadGroceriesEntries(identity, month, requestedBoardId),
        loadExtractedReceipts(identity, month, requestedBoardId),
    ]);

    return {
        entries,
        extractedReceipts,
    };
};

export const getGroceriesWriteKey = (
    identity: SessionIdentity | null,
    month: string,
) => {
    return resolveWriteKey(identity, "groceries", month);
};

export const getReceiptExtractionWriteKey = (
    identity: SessionIdentity | null,
    month: string,
) => {
    return resolveWriteKey(identity, "receipt-extractions", month);
};

type SupabaseGroceriesEntryRecord = {
    id: string;
    receipt_id: string;
    normalized_item: string;
    item: string;
    category: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    source_file_name: string | null;
    model_id: string | null;
    purchase_date: string;
    created_at: string;
};

type SupabaseExtractedReceiptRecord = {
    id: string;
    month: string;
    source_file_name: string | null;
    model_id: string | null;
    extracted_at: string;
    item_count: number;
    total: number;
    categories: string[];
    items: ExtractedReceipt["items"];
    created_at: string;
};

const asAuthenticatedIdentity = (identity: SessionIdentity | null) => {
    if (!identity?.userId) {
        throw new Error("A signed-in user id is required for board persistence.");
    }

    return identity as SessionIdentity & { userId: string };
};

const mapEntryRecord = (record: SupabaseGroceriesEntryRecord): GroceryEntry => {
    return {
        id: record.id,
        receiptId: record.receipt_id,
        normalizedItem: record.normalized_item,
        item: record.item,
        category: record.category as GroceryEntry["category"],
        quantity: Number(record.quantity),
        unitPrice: Number(record.unit_price),
        lineTotal: Number(record.line_total),
        sourceFileName: record.source_file_name,
        modelId: record.model_id,
        purchaseDate: record.purchase_date,
        createdAt: record.created_at,
    };
};

const mapExtractedReceiptRecord = (
    record: SupabaseExtractedReceiptRecord,
): ExtractedReceipt => {
    return {
        id: record.id,
        month: record.month,
        sourceFileName: record.source_file_name,
        modelId: record.model_id,
        extractedAt: record.extracted_at,
        itemCount: Number(record.item_count),
        total: Number(record.total),
        categories: (Array.isArray(record.categories) ? record.categories : []) as ExtractedReceipt["categories"],
        items: Array.isArray(record.items) ? record.items : [],
    };
};

const resolveBoardSelection = async (
    identity: SessionIdentity | null,
    requestedBoardId?: unknown,
) => {
    return resolveActiveBoardForIdentity(
        asAuthenticatedIdentity(identity),
        requestedBoardId,
    );
};

export const resolveGroceriesBoardSelection = async (
    identity: SessionIdentity | null,
    requestedBoardId?: unknown,
): Promise<ActiveBoardSelection> => {
    return resolveBoardSelection(identity, requestedBoardId);
};

const loadSupabaseGroceriesEntries = async (
    identity: SessionIdentity | null,
    month: string,
    requestedBoardId?: unknown,
) => {
    const selection = await resolveBoardSelection(identity, requestedBoardId);
    const client = getSupabaseServerClient();
    const { start } = getMonthRange(month);
    const nextMonthStart = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    ).toISOString();

    const { data, error } = await client
        .from("grocery_entries")
        .select(
            "id, receipt_id, normalized_item, item, category, quantity, unit_price, line_total, source_file_name, model_id, purchase_date, created_at",
        )
        .eq("board_id", selection.activeBoard.id)
        .gte("purchase_date", start.toISOString())
        .lt("purchase_date", nextMonthStart)
        .order("purchase_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(error.message || "Unable to load grocery entries.");
    }

    return ((data ?? []) as SupabaseGroceriesEntryRecord[]).map(mapEntryRecord);
};

const loadSupabaseExtractedReceipts = async (
    identity: SessionIdentity | null,
    month: string,
    requestedBoardId?: unknown,
) => {
    const selection = await resolveBoardSelection(identity, requestedBoardId);
    const client = getSupabaseServerClient();

    const { data, error } = await client
        .from("extracted_receipts")
        .select(
            "id, month, source_file_name, model_id, extracted_at, item_count, total, categories, items, created_at",
        )
        .eq("board_id", selection.activeBoard.id)
        .eq("month", month)
        .order("extracted_at", { ascending: false });

    if (error) {
        throw new Error(error.message || "Unable to load extracted receipts.");
    }

    return ((data ?? []) as SupabaseExtractedReceiptRecord[]).map(
        mapExtractedReceiptRecord,
    );
};

export const persistGroceriesEntries = async (
    identity: SessionIdentity | null,
    requestedBoardId: unknown,
    entries: GroceryEntry[],
) => {
    const authenticatedIdentity = asAuthenticatedIdentity(identity);
    const selection = await resolveBoardSelection(
        authenticatedIdentity,
        requestedBoardId,
    );
    const { board, client } = await requireBoardAccess(
        authenticatedIdentity,
        selection.activeBoard.id,
        ["owner", "editor"],
    );

    const insertPayload = entries.map((entry) => ({
        id: entry.id,
        board_id: board.id,
        created_by_user_id: authenticatedIdentity.userId,
        receipt_id: entry.receiptId,
        normalized_item: entry.normalizedItem,
        item: entry.item,
        category: entry.category,
        quantity: entry.quantity,
        unit_price: entry.unitPrice,
        line_total: entry.lineTotal,
        source_file_name: entry.sourceFileName,
        model_id: entry.modelId,
        purchase_date: entry.purchaseDate,
        created_at: entry.createdAt,
    }));

    const { error } = await client.from("grocery_entries").insert(insertPayload);

    if (error) {
        throw new Error(error.message || "Unable to persist grocery entries.");
    }

    return {
        activeBoard: selection.activeBoard,
        savedCount: entries.length,
    };
};

export const persistExtractedReceipt = async (
    identity: SessionIdentity | null,
    requestedBoardId: unknown,
    extraction: ExtractedReceipt,
) => {
    const authenticatedIdentity = asAuthenticatedIdentity(identity);
    const selection = await resolveBoardSelection(
        authenticatedIdentity,
        requestedBoardId,
    );
    const { board, client } = await requireBoardAccess(
        authenticatedIdentity,
        selection.activeBoard.id,
        ["owner", "editor"],
    );

    const { error } = await client.from("extracted_receipts").insert({
        id: extraction.id,
        board_id: board.id,
        created_by_user_id: authenticatedIdentity.userId,
        month: extraction.month,
        source_file_name: extraction.sourceFileName,
        model_id: extraction.modelId,
        extracted_at: extraction.extractedAt,
        item_count: extraction.itemCount,
        total: extraction.total,
        categories: extraction.categories,
        items: extraction.items,
        created_at: extraction.extractedAt,
    });

    if (error) {
        throw new Error(error.message || "Unable to persist extracted receipt.");
    }

    return {
        activeBoard: selection.activeBoard,
    };
};