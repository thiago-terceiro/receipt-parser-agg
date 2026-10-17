import { Ratelimit } from "@upstash/ratelimit";

import { getClientIpAddress } from "@/lib/extract-rate-limit";
import { hasRedisConfig, redis } from "@/lib/redis";

export type RateLimitResult = {
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
};

const resolveEnvValue = (names: readonly string[]): string | null => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
};

const parsePositiveInteger = (value: string | null, fallback: number): number => {
  const parsedValue = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
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

let registerLimiterInstance: Ratelimit | null | undefined;
let otelLimiterInstance: Ratelimit | null | undefined;

export const getRegisterRateLimiter = (): Ratelimit | null => {
  if (registerLimiterInstance !== undefined) {
    return registerLimiterInstance;
  }
  if (!hasRedisConfig || !redis) {
    registerLimiterInstance = null;
    return null;
  }
  const requests = parsePositiveInteger(
    resolveEnvValue([
      "AUTH_REGISTER_RATE_LIMIT_REQUESTS",
      "RECEIPT_AGG_AUTH_REGISTER_RATE_LIMIT_REQUESTS",
    ]),
    5,
  );
  const window = parseRateLimitDuration(
    resolveEnvValue([
      "AUTH_REGISTER_RATE_LIMIT_WINDOW",
      "RECEIPT_AGG_AUTH_REGISTER_RATE_LIMIT_WINDOW",
    ]),
    "10 m",
  );
  registerLimiterInstance = new Ratelimit({
    analytics: true,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: "receipt-ai:register-rate-limit",
    redis,
  });
  return registerLimiterInstance;
};

export const getOtelRateLimiter = (): Ratelimit | null => {
  if (otelLimiterInstance !== undefined) {
    return otelLimiterInstance;
  }
  if (!hasRedisConfig || !redis) {
    otelLimiterInstance = null;
    return null;
  }
  const requests = parsePositiveInteger(
    resolveEnvValue([
      "OTEL_RATE_LIMIT_REQUESTS",
      "RECEIPT_AGG_OTEL_RATE_LIMIT_REQUESTS",
    ]),
    60,
  );
  const window = parseRateLimitDuration(
    resolveEnvValue([
      "OTEL_RATE_LIMIT_WINDOW",
      "RECEIPT_AGG_OTEL_RATE_LIMIT_WINDOW",
    ]),
    "1 m",
  );
  otelLimiterInstance = new Ratelimit({
    analytics: true,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: "receipt-ai:otel-rate-limit",
    redis,
  });
  return otelLimiterInstance;
};

export const checkRegisterRateLimit = async (
  request: Request,
): Promise<RateLimitResult | null> => {
  const limiter = getRegisterRateLimiter();
  if (!limiter) {
    return null;
  }
  const clientIp = getClientIpAddress(request) || "anonymous";
  try {
    const result = await limiter.limit(`ip:${clientIp}`);
    return {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      success: result.success,
    };
  } catch (error) {
    console.warn("[rate-limit] Register rate limit check failed, failing open:", error);
    return null;
  }
};

export const checkOtelRateLimit = async (
  request: Request,
): Promise<RateLimitResult | null> => {
  const limiter = getOtelRateLimiter();
  if (!limiter) {
    return null;
  }
  const clientIp = getClientIpAddress(request) || "anonymous";
  try {
    const result = await limiter.limit(`ip:${clientIp}`);
    return {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      success: result.success,
    };
  } catch (error) {
    console.warn("[rate-limit] OTel rate limit check failed, failing open:", error);
    return null;
  }
};

export const computeRetryAfterSeconds = (reset: number): number => {
  if (!Number.isFinite(reset)) {
    return 1;
  }
  if (reset > 1_000_000_000_000) {
    return Math.max(Math.ceil((reset - Date.now()) / 1000), 1);
  }
  return Math.max(Math.ceil(reset), 1);
};

export const createRateLimitHeaders = (
  rateLimit: RateLimitResult,
): Record<string, string> => ({
  "Retry-After": String(computeRetryAfterSeconds(rateLimit.reset)),
  "X-RateLimit-Limit": String(rateLimit.limit),
  "X-RateLimit-Remaining": String(rateLimit.remaining),
  "X-RateLimit-Reset": String(rateLimit.reset),
});

