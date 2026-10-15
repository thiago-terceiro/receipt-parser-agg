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

type RateLimitDuration = Parameters<typeof Ratelimit.slidingWindow>[1];

const parseRateLimitDuration = (
    value: string | null,
    fallback: RateLimitDuration,
): RateLimitDuration => {
    if (!value) {
        return fallback;
    }

    const match = value.trim().match(/^(\d+)\s*(ms|s|m|h|d)$/i);
    if (!match) {
        return fallback;
    }

    const amount = Number.parseInt(match[1], 10);
    if (!Number.isFinite(amount) || amount <= 0) {
        return fallback;
    }

    const unit = match[2].toLowerCase() as Lowercase<typeof match[2]>;
    return `${amount} ${unit}` as RateLimitDuration;
};

const extractRateLimitRequests = parsePositiveInteger(
    resolveEnvValue([
        "RECEIPT_EXTRACT_RATE_LIMIT_REQUESTS",
        "RECEIPT_AGG_RECEIPT_EXTRACT_RATE_LIMIT_REQUESTS",
        "receipt_agg_RECEIPT_EXTRACT_RATE_LIMIT_REQUESTS",
    ]),
    10,
);

const extractRateLimitWindow = parseRateLimitDuration(
    resolveEnvValue([
        "RECEIPT_EXTRACT_RATE_LIMIT_WINDOW",
        "RECEIPT_AGG_RECEIPT_EXTRACT_RATE_LIMIT_WINDOW",
        "receipt_agg_RECEIPT_EXTRACT_RATE_LIMIT_WINDOW",
    ]),
    "5 m",
);

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

const normalizeIp = (ip: string): string => {
    const trimmed = ip.trim();
    const bracketedIpv6 = trimmed.match(/^\[([a-fA-F0-9:]+)\](?::\d+)?$/);
    if (bracketedIpv6) {
        return bracketedIpv6[1];
    }
    const ipv4WithPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
    if (ipv4WithPort) {
        return ipv4WithPort[1];
    }
    return trimmed;
};

export const getClientIpAddress = (request: Request): string | null => {
    // Prioritize trusted edge headers that cannot be spoofed by clients
    const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for")?.trim();
    if (vercelForwardedFor) {
        const ip = vercelForwardedFor.split(",")[0]?.trim();
        if (ip) {
            return normalizeIp(ip);
        }
    }

    const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
    if (cfConnectingIp) {
        const ip = cfConnectingIp.split(",")[0]?.trim();
        if (ip) {
            return normalizeIp(ip);
        }
    }

    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) {
        const ip = realIp.split(",")[0]?.trim();
        if (ip) {
            return normalizeIp(ip);
        }
    }

    // Fall back to standard x-forwarded-for proxy chain
    const forwardedFor = request.headers.get("x-forwarded-for")?.trim();
    if (forwardedFor) {
        const parts = forwardedFor.split(",").map((entry) => entry.trim()).filter(Boolean);
        if (parts.length > 0) {
            return normalizeIp(parts[0]);
        }
    }

    return null;
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
