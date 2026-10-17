let mockHasSupabaseConfig = false;
const mockGetSupabaseServerClient = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  get hasSupabaseServerConfig() {
    return mockHasSupabaseConfig;
  },
  getSupabaseServerClient: () => mockGetSupabaseServerClient(),
}));

import {
  authOptions,
  getAuthProviders,
  getCredentialsPassword,
  isCredentialsAuthEnabled,
  isTestAuthEnabled,
} from "./auth";

import type { Account, User } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";

interface AuthorizingProvider {
  id: string;
  authorize: (credentials?: Record<string, string>) => Promise<User | null> | User | null;
}

describe("authOptions", () => {
  const credentialsProvider = authOptions.providers.find(
    (p) => p.id === "credentials",
  ) as unknown as AuthorizingProvider;

  it("registers CredentialsProvider", () => {
    expect(credentialsProvider).toBeDefined();
    expect(credentialsProvider.id).toBe("credentials");
  });

  describe("Credentials authorize", () => {
    it("authorizes preconfigured account with username", async () => {
      const user = await credentialsProvider.authorize({
        username: "test",
        password: getCredentialsPassword(),
      });

      expect(user).toEqual({
        id: "test-user-owner-001",
        name: "Test Owner",
        email: "test@receipt.ai",
      });
    });

    it("authorizes preconfigured account with email", async () => {
      const user = await credentialsProvider.authorize({
        username: "partner@receipt.ai",
        password: getCredentialsPassword(),
      });

      expect(user).toEqual({
        id: "test-user-partner-002",
        name: "Test Partner",
        email: "partner@receipt.ai",
      });
    });

    it("rejects invalid password", async () => {
      const user = await credentialsProvider.authorize({
        username: "test",
        password: "wrong-password",
      });

      expect(user).toBeNull();
    });

    it("rejects empty username or password", async () => {
      expect(
        await credentialsProvider.authorize({ username: "", password: "password123" }),
      ).toBeNull();
      expect(
        await credentialsProvider.authorize({ username: "test", password: "" }),
      ).toBeNull();
    });

    it("authorizes generic demo user with valid password", async () => {
      const user = await credentialsProvider.authorize({
        username: "custom_demo",
        password: getCredentialsPassword(),
      });

      expect(user).toEqual({
        id: "user_custom_demo",
        name: "custom_demo",
        email: "custom_demo@receipt.local",
      });
    });

    it("rejects credentials authorization when credentials auth is disabled in production", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalEnableTestAuth = process.env.ENABLE_TEST_AUTH;

      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "production";
        delete process.env.ENABLE_TEST_AUTH;

        expect(isTestAuthEnabled()).toBe(false);
        expect(isCredentialsAuthEnabled()).toBe(false);

        const providers = getAuthProviders();
        expect(providers.find((p) => p.id === "credentials")).toBeUndefined();

        const user = await credentialsProvider.authorize({
          username: "test",
          password: getCredentialsPassword(),
        });
        expect(user).toBeNull();
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
        if (originalEnableTestAuth !== undefined) {
          process.env.ENABLE_TEST_AUTH = originalEnableTestAuth;
        } else {
          delete process.env.ENABLE_TEST_AUTH;
        }
      }
    });
  });

  describe("callbacks", () => {
    it("jwt callback sets token.uid from account for google", async () => {
      const account: Account = {
        provider: "google",
        type: "oauth",
        providerAccountId: "google-123",
      };
      const token = await authOptions.callbacks!.jwt!({
        token: {} as JWT,
        user: {} as User,
        account,
      });

      expect(token.uid).toBe("google-123");
    });

    it("jwt callback sets token.uid from user for credentials", async () => {
      const user: User = { id: "test-user-001", name: "Test" };
      const account: Account = {
        provider: "credentials",
        type: "credentials",
        providerAccountId: "cred-1",
      };
      const token = await authOptions.callbacks!.jwt!({
        token: {} as JWT,
        user,
        account,
      });

      expect(token.uid).toBe("test-user-001");
    });

    it("session callback attaches user.id from token.uid", async () => {
      const session = await authOptions.callbacks!.session!({
        session: { user: { name: "Test" }, expires: "2099-01-01" },
        token: { uid: "test-user-001" } as JWT,
        user: {} as unknown as AdapterUser,
        newSession: undefined,
        trigger: "update",
      });

      expect((session.user as { id?: string })?.id).toBe("test-user-001");
    });
  });

  describe("provider gating", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("excludes credentialsProvider in production when ENABLE_TEST_AUTH is not set", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.ENABLE_TEST_AUTH;

      const creds = authOptions.providers.find((p) => p.id === "credentials");
      expect(creds).toBeUndefined();
    });

    it("includes credentialsProvider in production when ENABLE_TEST_AUTH is true", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.ENABLE_TEST_AUTH = "true";

      const creds = authOptions.providers.find((p) => p.id === "credentials");
      expect(creds).toBeDefined();
    });

    it("includes credentialsProvider in non-production environments", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      delete process.env.ENABLE_TEST_AUTH;

      const creds = authOptions.providers.find((p) => p.id === "credentials");
      expect(creds).toBeDefined();
    });

    it("rejects authorize() in production when ENABLE_TEST_AUTH is not set", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.ENABLE_TEST_AUTH;

      const user = await credentialsProvider.authorize({
        username: "test",
        password: getCredentialsPassword(),
      });
      expect(user).toBeNull();
    });

    it("registers GitHub provider when AUTH_GITHUB_ID & AUTH_GITHUB_SECRET are configured", () => {
      process.env.AUTH_GITHUB_ID = "gh-client-123";
      process.env.AUTH_GITHUB_SECRET = "gh-secret-456";

      const gh = authOptions.providers.find((p) => p.id === "github");
      expect(gh).toBeDefined();
    });

    it("registers GitHub provider with fallback GITHUB_ID & GITHUB_SECRET", () => {
      delete process.env.AUTH_GITHUB_ID;
      delete process.env.AUTH_GITHUB_SECRET;
      process.env.GITHUB_ID = "gh-fallback-id";
      process.env.GITHUB_SECRET = "gh-fallback-secret";

      const gh = authOptions.providers.find((p) => p.id === "github");
      expect(gh).toBeDefined();
    });
  });

  describe("github jwt callback", () => {
    it("jwt callback sets token.uid from account for github", async () => {
      const account: Account = {
        provider: "github",
        type: "oauth",
        providerAccountId: "github-98765",
      };
      const token = await authOptions.callbacks!.jwt!({
        token: {} as JWT,
        user: {} as User,
        account,
      });

      expect(token.uid).toBe("github-98765");
    });
  });

  describe("canonical profile ID unification", () => {
    beforeEach(() => {
      mockHasSupabaseConfig = true;
      mockGetSupabaseServerClient.mockReset();
    });

    afterEach(() => {
      mockHasSupabaseConfig = false;
    });

    it("unifies token.uid with canonical profile id if profile with email exists", async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: "canonical-profile-uuid-123" },
                error: null,
              }),
            }),
          }),
        }),
      };
      mockGetSupabaseServerClient.mockReturnValue(mockClient);

      const account: Account = {
        provider: "google",
        type: "oauth",
        providerAccountId: "google-raw-id-999",
      };
      const user: User = {
        id: "google-raw-id-999",
        email: "user@example.com",
        name: "Test User",
      };

      const token = await authOptions.callbacks!.jwt!({
        token: {} as JWT,
        user,
        account,
      });

      expect(token.uid).toBe("canonical-profile-uuid-123");
    });

    it("creates profile and unifies token.uid if profile with email does not exist", async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: "newly-created-profile-id" },
                error: null,
              }),
            }),
          }),
        }),
      };
      mockGetSupabaseServerClient.mockReturnValue(mockClient);

      const account: Account = {
        provider: "github",
        type: "oauth",
        providerAccountId: "gh-raw-id-555",
      };
      const user: User = {
        id: "gh-raw-id-555",
        email: "newuser@example.com",
        name: "New GitHub User",
      };

      const token = await authOptions.callbacks!.jwt!({
        token: {} as JWT,
        user,
        account,
      });

      expect(token.uid).toBe("newly-created-profile-id");
    });

    it("does not query Supabase on subsequent JWT checks when token.uid is already unified", async () => {
      const existingToken: JWT = {
        uid: "canonical-cached-123",
        email: "user@example.com",
      } as unknown as JWT;

      const token = await authOptions.callbacks!.jwt!({
        token: existingToken,
        user: undefined as unknown as User,
        account: undefined as unknown as Account,
      });

      expect(token.uid).toBe("canonical-cached-123");
      expect(mockGetSupabaseServerClient).not.toHaveBeenCalled();
    });
  });
});

