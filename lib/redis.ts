import { Redis } from "@upstash/redis";

const prefixedEnvPrefixes = ["receipt_agg_", "RECEIPT_AGG_"];

const resolveEnvValue = (names: string[]) => {
    for (const name of names) {
        const value = process.env[name]?.trim();
        if (value) {
            return value;
        }
    }

    for (const prefix of prefixedEnvPrefixes) {
        for (const name of names) {
            const value = process.env[`${prefix}${name}`]?.trim();
            if (value) {
                return value;
            }
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

export const redis = hasRedisConfig
    ? new Redis({
        url: redisUrl!,
        token: redisToken!,
        automaticDeserialization: false,
    })
    : null;
