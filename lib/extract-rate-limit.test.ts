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

    test("prioritizes x-vercel-forwarded-for over spoofed x-forwarded-for", async () => {
        const { buildReceiptExtractionRateLimitKey, getClientIpAddress } = await loadModule();

        const request = makeRequest({
            "x-forwarded-for": "1.1.1.1, 2.2.2.2",
            "x-vercel-forwarded-for": "198.51.100.42",
        });

        expect(getClientIpAddress(request)).toBe("198.51.100.42");
        expect(buildReceiptExtractionRateLimitKey(request, null)).toBe("ip:198.51.100.42");
    });

    test("prioritizes cf-connecting-ip over spoofed x-forwarded-for", async () => {
        const { buildReceiptExtractionRateLimitKey, getClientIpAddress } = await loadModule();

        const request = makeRequest({
            "x-forwarded-for": "1.1.1.1",
            "cf-connecting-ip": "198.51.100.99",
        });

        expect(getClientIpAddress(request)).toBe("198.51.100.99");
        expect(buildReceiptExtractionRateLimitKey(request, null)).toBe("ip:198.51.100.99");
    });

    test("prioritizes x-real-ip over spoofed x-forwarded-for", async () => {
        const { buildReceiptExtractionRateLimitKey, getClientIpAddress } = await loadModule();

        const request = makeRequest({
            "x-forwarded-for": "1.1.1.1",
            "x-real-ip": "198.51.100.88",
        });

        expect(getClientIpAddress(request)).toBe("198.51.100.88");
        expect(buildReceiptExtractionRateLimitKey(request, null)).toBe("ip:198.51.100.88");
    });

    test("strips port numbers from IPv4 and IPv6 addresses", async () => {
        const { getClientIpAddress } = await loadModule();

        const requestIpv4 = makeRequest({
            "x-forwarded-for": "203.0.113.10:8080",
        });
        expect(getClientIpAddress(requestIpv4)).toBe("203.0.113.10");

        const requestIpv6 = makeRequest({
            "cf-connecting-ip": "[2001:db8::1]:443",
        });
        expect(getClientIpAddress(requestIpv6)).toBe("2001:db8::1");
    });

    test("handles comma-separated cf-connecting-ip and x-real-ip headers safely", async () => {
        const { getClientIpAddress } = await loadModule();

        const requestCf = makeRequest({
            "cf-connecting-ip": "198.51.100.99, 10.0.0.1",
        });
        expect(getClientIpAddress(requestCf)).toBe("198.51.100.99");

        const requestReal = makeRequest({
            "x-real-ip": "198.51.100.88, 10.0.0.2",
        });
        expect(getClientIpAddress(requestReal)).toBe("198.51.100.88");
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