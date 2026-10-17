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
});
