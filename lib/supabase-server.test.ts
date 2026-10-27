const mockCreateClient = jest.fn(
    (_url?: string, _key?: string, _options?: unknown) => ({
        from: jest.fn(),
        auth: {},
    }),
);

jest.mock("@supabase/supabase-js", () => ({
    createClient: (url: string, key: string, options?: unknown) =>
        mockCreateClient(url, key, options),
}));

describe("lib/supabase-server", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        mockCreateClient.mockClear();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it("memoizes and returns the same singleton Supabase client on multiple calls", async () => {
        process.env.SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";

        const { getSupabaseServerClient, resetSupabaseServerClientForTesting } =
            await import("./supabase-server");

        resetSupabaseServerClientForTesting();

        const client1 = getSupabaseServerClient();
        const client2 = getSupabaseServerClient();

        expect(client1).toBe(client2);
        expect(mockCreateClient).toHaveBeenCalledTimes(1);
        expect(mockCreateClient).toHaveBeenCalledWith(
            "https://example.supabase.co",
            "mock-service-role-key",
            expect.objectContaining({
                global: {
                    headers: {
                        "X-Client-Info": "receipt-ai/shared-boards",
                    },
                },
            }),
        );
    });

    it("creates a new instance after resetSupabaseServerClientForTesting()", async () => {
        process.env.SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";

        const { getSupabaseServerClient, resetSupabaseServerClientForTesting } =
            await import("./supabase-server");

        resetSupabaseServerClientForTesting();
        const client1 = getSupabaseServerClient();

        resetSupabaseServerClientForTesting();
        const client2 = getSupabaseServerClient();

        expect(mockCreateClient).toHaveBeenCalledTimes(2);
        expect(client1).toBeDefined();
        expect(client2).toBeDefined();
    });

    it("throws error when Supabase URL or key is missing", async () => {
        delete process.env.SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;

        const { getSupabaseServerClient } = await import("./supabase-server");

        expect(() => getSupabaseServerClient()).toThrow(
            "Supabase server access is not configured.",
        );
    });

    it("creates and memoizes user-scoped Supabase client with X-App-User-Id header", async () => {
        process.env.SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";

        const { getSupabaseServerClient, resetSupabaseServerClientForTesting } =
            await import("./supabase-server");

        resetSupabaseServerClientForTesting();

        const userClient1 = getSupabaseServerClient({ userId: "user-123" });
        const userClient2 = getSupabaseServerClient({ userId: "user-123" });
        const otherUserClient = getSupabaseServerClient("user-456");

        expect(userClient1).toBe(userClient2);
        expect(userClient1).not.toBe(otherUserClient);

        expect(mockCreateClient).toHaveBeenCalledWith(
            "https://example.supabase.co",
            "mock-service-role-key",
            expect.objectContaining({
                global: {
                    headers: {
                        "X-Client-Info": "receipt-ai/shared-boards",
                        "X-App-User-Id": "user-123",
                    },
                },
            }),
        );
    });

    it("mints signed HS256 user JWT when SUPABASE_JWT_SECRET is set", async () => {
        process.env.SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
        process.env.SUPABASE_JWT_SECRET = "super-secret-jwt-key";

        const { getScopedSupabaseServerClient, resetSupabaseServerClientForTesting, createSignedUserJwt } =
            await import("./supabase-server");

        resetSupabaseServerClientForTesting();

        const rawJwt = createSignedUserJwt("user-789", "super-secret-jwt-key");
        const [, payloadB64] = rawJwt.split(".");
        const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

        expect(payload).toMatchObject({
            aud: "authenticated",
            role: "authenticated",
            sub: "user-789",
            app_user_id: "user-789",
        });
        expect(typeof payload.exp).toBe("number");

        const client = getScopedSupabaseServerClient({ userId: "user-789" });
        expect(client).toBeDefined();

        expect(mockCreateClient).toHaveBeenCalledWith(
            "https://example.supabase.co",
            "mock-service-role-key",
            expect.objectContaining({
                global: {
                    headers: expect.objectContaining({
                        "X-Client-Info": "receipt-ai/shared-boards",
                        "X-App-User-Id": "user-789",
                        Authorization: expect.stringMatching(/^Bearer eyJ/),
                    }),
                },
            }),
        );
    });

    it("refreshes user-scoped client when cached token approaches expiry", async () => {
        process.env.SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
        process.env.SUPABASE_JWT_SECRET = "super-secret-jwt-key";

        const { getScopedSupabaseServerClient, resetSupabaseServerClientForTesting } =
            await import("./supabase-server");

        resetSupabaseServerClientForTesting();

        const initialClient = getScopedSupabaseServerClient({ userId: "user-expiring" });
        expect(mockCreateClient).toHaveBeenCalledTimes(1);

        // Within 1 hour, cached client is reused
        const sameClient = getScopedSupabaseServerClient({ userId: "user-expiring" });
        expect(sameClient).toBe(initialClient);
        expect(mockCreateClient).toHaveBeenCalledTimes(1);

        // Advance time past 1 hour (3600 seconds)
        const dateSpy = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 3700 * 1000);
        try {
            const refreshedClient = getScopedSupabaseServerClient({ userId: "user-expiring" });
            expect(mockCreateClient).toHaveBeenCalledTimes(2);
            expect(refreshedClient).toBeDefined();
        } finally {
            dateSpy.mockRestore();
        }
    });
});
