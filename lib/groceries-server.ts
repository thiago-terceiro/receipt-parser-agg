import {
    type ExtractedReceipt,
    type GroceryEntry
} from "@/lib/groceries";
import { redis } from "@/lib/redis";
import type { SessionIdentity } from "@/lib/session";

const normalizeStorageToken = (value: string) => value.trim().toLowerCase();

const getGroceriesStorageKeyByUserId = (
    userId: string,
    month: string,
) => {
    return `groceries:uid:${normalizeStorageToken(userId)}:${month}`;
};

const getLegacyGroceriesStorageKeyByEmail = (
    email: string,
    month: string,
) => {
    return `groceries:${normalizeStorageToken(email)}:${month}`;
};

const getReceiptExtractionStorageKeyByUserId = (
    userId: string,
    month: string,
) => {
    return `receipt-extractions:uid:${normalizeStorageToken(userId)}:${month}`;
};

const getLegacyReceiptExtractionStorageKeyByEmail = (
    email: string,
    month: string,
) => {
    return `receipt-extractions:${normalizeStorageToken(email)}:${month}`;
};

const buildLookupKeys = (
    identity: SessionIdentity | null,
    month: string,
    userIdBuilder: (userId: string, month: string) => string,
    emailBuilder: (email: string, month: string) => string,
) => {
    if (!identity) {
        return [];
    }

    return [
        identity.userId ? userIdBuilder(identity.userId, month) : null,
        identity.email ? emailBuilder(identity.email, month) : null,
    ].filter((value): value is string => Boolean(value));
};

const resolveWriteKey = (
    identity: SessionIdentity | null,
    month: string,
    userIdBuilder: (userId: string, month: string) => string,
    emailBuilder: (email: string, month: string) => string,
) => {
    if (!identity) {
        return null;
    }

    if (identity.userId) {
        return userIdBuilder(identity.userId, month);
    }

    if (identity.email) {
        return emailBuilder(identity.email, month);
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

export const loadGroceriesEntries = async (
    identity: SessionIdentity | null,
    month: string,
) => {
    return loadFirstMatchingRedisList<GroceryEntry>(
        buildLookupKeys(
            identity,
            month,
            getGroceriesStorageKeyByUserId,
            getLegacyGroceriesStorageKeyByEmail,
        ),
    );
};

export const loadExtractedReceipts = async (
    identity: SessionIdentity | null,
    month: string,
) => {
    return loadFirstMatchingRedisList<ExtractedReceipt>(
        buildLookupKeys(
            identity,
            month,
            getReceiptExtractionStorageKeyByUserId,
            getLegacyReceiptExtractionStorageKeyByEmail,
        ),
    );
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
    return resolveWriteKey(
        identity,
        month,
        getGroceriesStorageKeyByUserId,
        getLegacyGroceriesStorageKeyByEmail,
    );
};

export const getReceiptExtractionWriteKey = (
    identity: SessionIdentity | null,
    month: string,
) => {
    return resolveWriteKey(
        identity,
        month,
        getReceiptExtractionStorageKeyByUserId,
        getLegacyReceiptExtractionStorageKeyByEmail,
    );
};