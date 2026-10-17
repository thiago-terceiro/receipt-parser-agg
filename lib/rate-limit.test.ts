const createRateLimitRequest = (headers: Record<string, string> = {}) => {
  return {
    headers: new Headers(headers),
  } as unknown as Request;
};

const loadRateLimitModule = async (options?: {
  hasRedisConfig?: boolean;
  redis?: object | null;
  limitMock?: jest.Mock;
}) => {
  const defaultLimitMock = jest.fn(async () => ({
    success: true,
    limit: 5,
    remaining: 4,
    reset: 60,
  }));

  const slidingWindowMock = jest.fn(() => "sliding-window");

  jest.doMock("@upstash/ratelimit", () => ({
    Ratelimit: class MockRatelimit {
      static slidingWindow = slidingWindowMock;
      limit = options?.limitMock ?? defaultLimitMock;
    },
  }));

  jest.doMock("@/lib/redis", () => ({
    hasRedisConfig: options?.hasRedisConfig ?? false,
    redis: options?.redis ?? null,
  }));

  return import("@/lib/rate-limit");
};

describe("lib/rate-limit", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.unmock("@upstash/ratelimit");
    jest.unmock("@/lib/redis");
  });

  describe("checkRegisterRateLimit", () => {
    it("returns null when redis is not configured", async () => {
      const { checkRegisterRateLimit } = await loadRateLimitModule({
        hasRedisConfig: false,
      });

      const result = await checkRegisterRateLimit(createRateLimitRequest());
      expect(result).toBeNull();
    });

    it("evaluates rate limit with client IP when redis is configured", async () => {
      const limitMock = jest.fn(async () => ({
        success: true,
        limit: 5,
        remaining: 4,
        reset: 120,
      }));

      const { checkRegisterRateLimit } = await loadRateLimitModule({
        hasRedisConfig: true,
        redis: {},
        limitMock,
      });

      const request = createRateLimitRequest({
        "x-forwarded-for": "192.168.1.1",
      });

      const result = await checkRegisterRateLimit(request);
      expect(limitMock).toHaveBeenCalledWith("ip:192.168.1.1");
      expect(result).toEqual({
        success: true,
        limit: 5,
        remaining: 4,
        reset: 120,
      });
    });

    it("fails open and logs warning when redis throws an error", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const limitMock = jest.fn().mockRejectedValue(new Error("Redis connection refused"));

      const { checkRegisterRateLimit } = await loadRateLimitModule({
        hasRedisConfig: true,
        redis: {},
        limitMock,
      });

      const result = await checkRegisterRateLimit(createRateLimitRequest());
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe("checkOtelRateLimit", () => {
    it("returns null when redis is not configured", async () => {
      const { checkOtelRateLimit } = await loadRateLimitModule({
        hasRedisConfig: false,
      });

      const result = await checkOtelRateLimit(createRateLimitRequest());
      expect(result).toBeNull();
    });

    it("evaluates otel rate limit with client IP when configured", async () => {
      const limitMock = jest.fn(async () => ({
        success: false,
        limit: 60,
        remaining: 0,
        reset: 45,
      }));

      const { checkOtelRateLimit } = await loadRateLimitModule({
        hasRedisConfig: true,
        redis: {},
        limitMock,
      });

      const request = createRateLimitRequest({
        "cf-connecting-ip": "10.0.0.5",
      });

      const result = await checkOtelRateLimit(request);
      expect(limitMock).toHaveBeenCalledWith("ip:10.0.0.5");
      expect(result).toEqual({
        success: false,
        limit: 60,
        remaining: 0,
        reset: 45,
      });
    });

    it("fails open when otel rate limiter throws an error", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const limitMock = jest.fn().mockRejectedValue(new Error("Timeout"));

      const { checkOtelRateLimit } = await loadRateLimitModule({
        hasRedisConfig: true,
        redis: {},
        limitMock,
      });

      const result = await checkOtelRateLimit(createRateLimitRequest());
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe("createRateLimitHeaders", () => {
    it("formats standard rate limit headers correctly", async () => {
      const { createRateLimitHeaders } = await loadRateLimitModule();

      const headers = createRateLimitHeaders({
        success: false,
        limit: 5,
        remaining: 0,
        reset: 30,
      });

      expect(headers).toEqual({
        "Retry-After": "30",
        "X-RateLimit-Limit": "5",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": "30",
      });
    });

    it("ensures Retry-After is at least 1 second", async () => {
      const { createRateLimitHeaders } = await loadRateLimitModule();

      const headers = createRateLimitHeaders({
        success: false,
        limit: 5,
        remaining: 0,
        reset: 0,
      });

      expect(headers["Retry-After"]).toBe("1");
    });

    it("converts Upstash millisecond epoch timestamp to delta seconds for Retry-After", async () => {
      const { createRateLimitHeaders } = await loadRateLimitModule();

      const futureMs = Date.now() + 45000;
      const headers = createRateLimitHeaders({
        success: false,
        limit: 60,
        remaining: 0,
        reset: futureMs,
      });

      const retryAfterSeconds = Number.parseInt(headers["Retry-After"], 10);
      expect(retryAfterSeconds).toBeGreaterThanOrEqual(44);
      expect(retryAfterSeconds).toBeLessThanOrEqual(46);
      expect(headers["X-RateLimit-Reset"]).toBe(String(futureMs));
    });
  });
});
