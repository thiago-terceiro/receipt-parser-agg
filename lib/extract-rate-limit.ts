import { Ratelimit } from "@upstash/ratelimit";

import { hasRedisConfig, redis } from "@/lib/redis";
import type { SessionIdentity } from "@/lib/session";

const resolveEnvValue = (names: readonly string[]) => {
    for (const name of names) {
        const value = process.env[name]?.trim();
        if (value) {
            return value;
        }
    }

    return null;
};

const parsePositiveInteger = (value: string | null, fallback: number) => {
    const parsedValue = Number.parseInt(value ?? "", 10);

    return Number.isFinite(parsedValue) && parsedValue > 0
        ? parsedValue
        : fallback;
};

const extractRateLimitRequests = parsePositiveInteger(
    resolveEnvValue([
        "RECEIPT_EXTRACT_RATE_LIMIT_REQUESTS",
        "RECEIPT_AGG_RECEIPT_EXTRACT_RATE_LIMIT_REQUESTS",
        "receipt_agg_RECEIPT_EXTRACT_RATE_LIMIT_REQUESTS",
    ]),
    10,
);

const extractRateLimitWindow =
    resolveEnvValue([
        "RECEIPT_EXTRACT_RATE_LIMIT_WINDOW",
        "RECEIPT_AGG_RECEIPT_EXTRACT_RATE_LIMIT_WINDOW",
        "receipt_agg_RECEIPT_EXTRACT_RATE_LIMIT_WINDOW",
    ]) ?? "5 m";

const extractRateLimiter =
    hasRedisConfig && redis
        ? new Ratelimit({
            analytics: true,
            limiter: Ratelimit.slidingWindow(
                extractRateLimitRequests,
                extractRateLimitWindow,
            ),
            prefix: "receipt-ai:extract-rate-limit",
            redis,
        })
        : null;

const getClientIpAddress = (request: Request) => {
    const forwardedFor = request.headers.get("x-forwarded-for")?.trim();
    if (forwardedFor) {
        return forwardedFor.split(",")[0]?.trim() || null;
    }

    const realIp = request.headers.get("x-real-ip")?.trim();
    return realIp || null;
};

export const buildReceiptExtractionRateLimitKey = (
    request: Request,
    identity: SessionIdentity | null,
) => {
    if (identity?.userId) {
        return `user:${identity.userId}`;
    }

    if (identity?.email) {
        return `email:${identity.email}`;
    }

    const clientIpAddress = getClientIpAddress(request);
    if (clientIpAddress) {
        return `ip:${clientIpAddress}`;
    }

    return "anonymous";
};

export type ReceiptExtractionRateLimitResult = {
    limit: number;
    remaining: number;
    reset: number;
    success: boolean;
};

export const checkReceiptExtractionRateLimit = async (
    request: Request,
    identity: SessionIdentity | null,
): Promise<ReceiptExtractionRateLimitResult | null> => {
    if (!extractRateLimiter) {
        return null;
    }

    const result = await extractRateLimiter.limit(
        buildReceiptExtractionRateLimitKey(request, identity),
    );

    return {
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        success: result.success,
    };
};
