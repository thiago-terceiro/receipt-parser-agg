import { createHmac } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const prefixedEnvPrefixes = ["receipt_agg_", "RECEIPT_AGG_"];

const resolveEnvValue = (names: readonly string[]) => {
    const candidates = [
        ...names,
        ...prefixedEnvPrefixes.flatMap((prefix) =>
            names.map((name) => `${prefix}${name}`),
        ),
    ];

    for (const name of candidates) {
        const value = process.env[name]?.trim();
        if (value) {
            return value;
        }
    }

    return null;
};

const supabaseUrl = resolveEnvValue(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
const supabaseServiceRoleKey = resolveEnvValue(["SUPABASE_SERVICE_ROLE_KEY"]);

export const hasSupabaseServerConfig = Boolean(
    supabaseUrl && supabaseServiceRoleKey,
);

if (!hasSupabaseServerConfig && (supabaseUrl || supabaseServiceRoleKey)) {
    console.warn(
        "Supabase server access is disabled because the URL or service role key is missing.",
    );
}

const base64UrlEncode = (input: string | Buffer): string => {
    const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
    return buf.toString("base64url");
};

export const createSignedUserJwt = (
    userId: string,
    secret: string,
    expiresInSeconds = 3600,
): string => {
    const header = {
        alg: "HS256",
        typ: "JWT",
    };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        aud: "authenticated",
        role: "authenticated",
        sub: userId,
        app_user_id: userId,
        iat: now,
        exp: now + expiresInSeconds,
    };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac("sha256", secret)
        .update(dataToSign)
        .digest();
    const encodedSignature = base64UrlEncode(signature);
    return `${dataToSign}.${encodedSignature}`;
};

type ScopedCacheEntry = {
    client: SupabaseClient;
    expiresAt: number;
};

const JWT_TTL_SECONDS = 3600;
const JWT_REFRESH_BUFFER_MS = 60_000;
const MAX_SCOPED_CLIENT_CACHE_SIZE = 500;

let cachedSupabaseServerClient: SupabaseClient | null = null;
const scopedClientCache = new Map<string, ScopedCacheEntry>();

export const resetSupabaseServerClientForTesting = () => {
    cachedSupabaseServerClient = null;
    scopedClientCache.clear();
};

const pruneScopedClientCache = (now: number) => {
    for (const [key, entry] of scopedClientCache) {
        if (entry.expiresAt <= now + JWT_REFRESH_BUFFER_MS) {
            scopedClientCache.delete(key);
        }
    }

    while (scopedClientCache.size >= MAX_SCOPED_CLIENT_CACHE_SIZE) {
        const oldestKey = scopedClientCache.keys().next().value;
        if (oldestKey === undefined) {
            break;
        }
        scopedClientCache.delete(oldestKey);
    }
};

export type UserContext = { userId?: string | null } | string | null | undefined;

export const getSupabaseServerClient = (userContext?: UserContext): SupabaseClient => {
    const currentUrl = resolveEnvValue(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]) ?? supabaseUrl;
    const currentKey = resolveEnvValue(["SUPABASE_SERVICE_ROLE_KEY"]) ?? supabaseServiceRoleKey;

    if (!currentUrl || !currentKey) {
        throw new Error(
            "Supabase server access is not configured. Define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        );
    }

    const rawUserId = typeof userContext === "string" ? userContext : userContext?.userId;
    const userId = rawUserId?.trim() || null;

    if (!userId) {
        if (!cachedSupabaseServerClient) {
            cachedSupabaseServerClient = createClient(currentUrl, currentKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
                global: {
                    headers: {
                        "X-Client-Info": "receipt-ai/shared-boards",
                    },
                },
            });
        }
        return cachedSupabaseServerClient;
    }

    const now = Date.now();
    const cachedEntry = scopedClientCache.get(userId);
    // Reuse cached client only if token has at least 60s remaining before expiry
    if (cachedEntry && cachedEntry.expiresAt > now + JWT_REFRESH_BUFFER_MS) {
        scopedClientCache.delete(userId);
        scopedClientCache.set(userId, cachedEntry);
        return cachedEntry.client;
    }

    const jwtSecret = resolveEnvValue(["SUPABASE_JWT_SECRET"]);
    let currentJwt = jwtSecret
        ? createSignedUserJwt(userId, jwtSecret, JWT_TTL_SECONDS)
        : null;
    let currentJwtExpiresAt = jwtSecret
        ? now + JWT_TTL_SECONDS * 1000
        : Infinity;

    const headers: Record<string, string> = {
        "X-Client-Info": "receipt-ai/shared-boards",
        "X-App-User-Id": userId,
    };

    if (currentJwt) {
        headers.Authorization = `Bearer ${currentJwt}`;
    }

    const client = createClient(currentUrl, currentKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        ...(jwtSecret
            ? {
                // Reuse the cached JWT until within the refresh buffer instead of re-signing HMAC on every query.
                accessToken: async () => {
                    const currentTime = Date.now();
                    if (!currentJwt || currentJwtExpiresAt <= currentTime + JWT_REFRESH_BUFFER_MS) {
                        currentJwt = createSignedUserJwt(userId, jwtSecret, JWT_TTL_SECONDS);
                        currentJwtExpiresAt = currentTime + JWT_TTL_SECONDS * 1000;
                    }
                    return currentJwt;
                },
            }
            : {}),
        global: {
            headers,
        },
    });

    pruneScopedClientCache(now);
    scopedClientCache.set(userId, { client, expiresAt: currentJwtExpiresAt });
    return client;
};

export const getScopedSupabaseServerClient = (userContext?: UserContext): SupabaseClient =>
    getSupabaseServerClient(userContext);