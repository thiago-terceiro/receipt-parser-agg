import {
    type ExtractedReceipt,
    type GroceryEntry
} from "@/lib/groceries";
import { redis } from "@/lib/redis";
import type { SessionIdentity } from "@/lib/session";

const normalizeStorageToken = (value: string) => value.trim().toLowerCase();

type StorageNamespace = "groceries" | "receipt-extractions";

const getStorageKeyByUserId = (
    namespace: StorageNamespace,
    userId: string,
    month: string,
) => {
    return `${namespace}:uid:${normalizeStorageToken(userId)}:${month}`;
};

const getLegacyStorageKeyByEmail = (
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
) => {
    return loadStorageEntries<GroceryEntry>("groceries", identity, month);
};

export const loadExtractedReceipts = async (
    identity: SessionIdentity | null,
    month: string,
) => {
    return loadStorageEntries<ExtractedReceipt>("receipt-extractions", identity, month);
};

export const loadGroceriesMonthData = async (
    identity: SessionIdentity | null,
    month: string,
) => {
    const [entries, extractedReceipts] = await Promise.all([
        loadGroceriesEntries(identity, month),
        loadExtractedReceipts(identity, month),
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