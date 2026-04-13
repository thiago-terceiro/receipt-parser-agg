import { Redis } from "@upstash/redis";

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

const redisUrl = resolveEnvValue([
    "UPSTASH_REDIS_REST_URL",
    "KV_REST_API_URL",
]);

const redisToken = resolveEnvValue([
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_TOKEN",
]);

export const hasRedisConfig = Boolean(redisUrl && redisToken);

if (!hasRedisConfig && (redisUrl || redisToken)) {
    console.warn(
        "Redis persistence is disabled because the Upstash URL or token is missing.",
    );
}

const redisConfig = redisUrl && redisToken
    ? {
        url: redisUrl,
        token: redisToken,
    }
    : null;

export const redis = redisConfig
    ? new Redis({
        ...redisConfig,
        automaticDeserialization: false,
    })
    : null;
