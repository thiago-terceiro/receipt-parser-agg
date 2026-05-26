const makeRequest = (headers: Record<string, string> = {}) => {
    return {
        headers: new Headers(headers),
    } as unknown as Request;
};

const loadModule = async (options?: {
    hasRedisConfig?: boolean;
    redis?: object | null;
}) => {
    const slidingWindowMock = jest.fn(() => "window");

    jest.doMock("@upstash/ratelimit", () => ({
        Ratelimit: class MockRatelimit {
            static slidingWindow = slidingWindowMock;

            limit = jest.fn(async () => ({
                success: true,
                limit: 10,
                remaining: 9,
                reset: 60,
            }));
        },
    }));

    jest.doMock("@/lib/redis", () => ({
        hasRedisConfig: options?.hasRedisConfig ?? false,
        redis: options?.redis ?? null,
    }));

    return import("@/lib/extract-rate-limit");
};

describe("extract rate limit helpers", () => {
    afterEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.unmock("@upstash/ratelimit");
        jest.unmock("@/lib/redis");
    });

    test("prefers authenticated user ids for the rate limit key", async () => {
        const { buildReceiptExtractionRateLimitKey } = await loadModule();

        const request = makeRequest({
            "x-forwarded-for": "203.0.113.10",
        });

        expect(
            buildReceiptExtractionRateLimitKey(request, {
                userId: "user-123",
                email: "user@example.com",
                name: null,
                image: null,
            }),
        ).toBe("user:user-123");
    });

    test("falls back to the forwarded ip address for anonymous requests", async () => {
        const { buildReceiptExtractionRateLimitKey } = await loadModule();

        const request = makeRequest({
            "x-forwarded-for": "203.0.113.10, 198.51.100.5",
        });

        expect(buildReceiptExtractionRateLimitKey(request, null)).toBe(
            "ip:203.0.113.10",
        );
    });

    test("disables the limiter when redis is not configured", async () => {
        const { checkReceiptExtractionRateLimit } = await loadModule({
            hasRedisConfig: false,
        });

        const result = await checkReceiptExtractionRateLimit(
            makeRequest(),
            null,
        );

        expect(result).toBeNull();
    });
});